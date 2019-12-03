const Discord = require('discord.js');
const config = require('./config.json');
const prefix = config.prefix;
const token = config.token;
const searchkey = config.searchkey;
const GSR = require('google-search-results-nodejs')
const client = new Discord.Client();
const gclient = new GSR.GoogleSearchResults(searchkey)


var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://'+config.dbhost+'/'+config.database;

var searchString = "";

//Signal while successfully connected
client.once('ready', () => {
	console.log('Ready!');
});

// builds query string by parsing array elements
function buildQueryString(value,index,array){
	searchString += (searchString)?" "+value:value;
}


//implement on message event
client.on('message', message => { 
         searchString = "";	
	if (!message.content.startsWith(prefix) || message.author.bot) return;

	const args = message.content.slice(prefix.length).split(/ +/);// parsing arguments
	const command = args.shift().toLowerCase(); // preparing command

	args.forEach(buildQueryString);

        if (message.content === `${prefix}hi`) { // execute !hi
		message.channel.send('hey');
	} else if (command == 'google'){ // execute !google <text>
		try{
			message.channel.send(`Searching results for: ${searchString}`);
			let result = gclient.json({
 			q: searchString, // search query
 			location: "Austin, TX", // location 
			}, (data) => {
			let reply = "";
			let sresults = [];
			data.organic_results.forEach((value,index,array) => {
				if(value.position > 5)
					return false;
				reply += value.link + " \n ";	
				sresults.push(value.link);
			});
			if(reply != ""){
				message.channel.send(`${reply}`);
			}else{
				message.channel.send('oops, no result found for '+searchString);
			}
			MongoClient.connect(url, {useUnifiedTopology: true,useNewUrlParser: true} , function(err, client) {
				let db = client.db('poc');
				db.collection('search').insertOne({
        				query: data.search_parameters.q,
        				results: sresults
    				});
				client.close();
			}); 
		})

		}catch(err){
			console.log(err);
		}
	}else if (command == 'recent'){ // execute recent searches command
		try{
			MongoClient.connect(url, {useUnifiedTopology: true,useNewUrlParser: true} , function(err, client) {
                      		let db = client.db('poc');
		      		let collection = db.collection("search");
		      		let reply = ""; 
		      		collection.find({'query': {'$regex': `${searchString}`, '$options' : 'i'}}).toArray((err, results) => {
        				if(err) {
            					console.log(err);
            					process.exit(0);
        				}
        			results.forEach((value,index,array) => {
					reply += value.query + "\n";
				});
				if(reply == "")
					reply = "oops, no relevent results found";
				message.channel.send(`${reply}`);
    			});
			client.close();
                });
		}catch(err){
			console.log(err);
		}
	}
});
client.login(token);
