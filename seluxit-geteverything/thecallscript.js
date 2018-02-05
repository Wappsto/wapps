// #!/usr/bin/env node
// //const args = process.argv;
// //console.log(args);
//
// // Global vars
const http = require('http');
var fs = require('fs-extra');
var request = require('request');
var unzip = require('unzip');
var path = require('path');
var mkdir = require('mkdirp');
var nrc = require('node-run-cmd');
var questions = require('questions');
var _ = require('underscore');
var exec = require('child_process').exec;
var xsession;
var bareboneversion;
var output = "downloadedfile.zip";
var downloadedapp = "downloadedapp.zip";
var items = [];
var rightanswer;
var itemnumber = 0;
var appfolder;
//const targetip = '10.10.2.21'; // Marek's
const targetip = '10.10.1.202'; // Sami's

//
//
// // the login json file
var login = {
	"username": "",
	"password": "",
	":type": "urn:seluxit:xml:wappsto:session-1.2"
}

//it all starts here
requestLoginInput()

.catch((err) => {
	console.log(err);
	console.log('Error came up.');
})

// Display all apps and versions from the user account.
// If decision = 6 (user wants to delete a whole app), counting is done on Apps not versions.
function displayApps(decision){
	itemnumber = 0;
	items = [];
		console.log('Loading your apps. Choose your app: ');
		//code for getting and displaying all the apps
		request({
				url: "http://" + targetip +":9292/services/application?expand=1",
				method: "GET",
				json: true,
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json',
					'X-Session': xsession
			}
		},  function (error, response, body){
			if (response.body[0]){
				if (decision == 6){
					//console.log(body);
					response.body.forEach(function (bodyobj, appIndex){
						console.log("[" + itemnumber + "] Application: "+appIndex+" --------------------------------------");
						items.push(bodyobj);
						itemnumber++;
						//console.log(bodyobj[':id']);
						bodyobj.version.forEach(function(versionobj){
							console.log(versionobj['name'] + " --- version: " + versionobj['version_app'] + " --- status: " + versionobj['status']);
						})
					})
					askUserInput(decision);
				} else {
					response.body.forEach(function (bodyobj, appIndex){
						console.log("Application: "+appIndex+" --------------------------------------");
						//console.log(bodyobj[':id']);
						bodyobj.version.forEach(function(versionobj){
							console.log("[" + itemnumber + "] " +versionobj['name'] + " --- version: " + versionobj['version_app'] + " --- status: " + versionobj['status']);
							items.push(versionobj);
							itemnumber++;
						})
					})
					askUserInput(decision);
				}
			} else {
				console.log(body.message);
				requestDecision();
			}

		});
}

// makes the request that downloads the files
function downloadApp(decision){
	console.log('Downloading your files');
	request({
					url: "http://" + targetip +":3005/file/" + items[rightanswer][':id'],
					method: "GET",
					encoding: null,
					headers: {
						'Accept': 'application/json',
						'Content-Type': 'application/json',
						'X-Session': xsession
				}
	},  function (error, response, body){
		if(error){
			console.log("Failed to download files. Try again.");
		}
		//start checking if app exists
			var pathstomanifest = [];
			var found = false;
			pathstomanifest = searchManifestFiles('./')
			if (pathstomanifest.length > 0){
				pathstomanifest.forEach(function(path1){
					var eachmanifest = JSON.parse(fs.readFileSync(path1, 'utf8'));
					if (eachmanifest[':id'] === items[rightanswer][':id']){
						appfolder = path.dirname(path1);
						//console.log(appfolder);
						found = true;
					}
				})
			}
			if(found){
				askIfReplaceApp(body, decision, appfolder);
			}
			else {
				downloadSpecificApp(body, decision)
			}
		//end checking
	});
}

// writes the content of downloaded version into filestoupload
// if app already exists, rename the old one to .old
// extracts and removes the zip file of downloaded app
function downloadSpecificApp(app, decision){
	fs.writeFile(downloadedapp, app, function(err) {
		console.log("App Downloaded!");
		//console.log(items[rightanswer][':id']);
		var appfoldername = items[rightanswer][':id'];
		if (fs.existsSync(appfoldername)) {
				console.log('App folder already exists. Renaming local version to .old');
				fs.renameSync(appfoldername, appfoldername + '.old.' + Date.now());
		}
		// fs.createReadStream(downloadedapp).pipe(unzip.Extract({ path: './yourApp/' }))
		var x = fs.createReadStream(downloadedapp);
		x.pipe(unzip.Extract({ path: './'+appfoldername +'/' }))
		.on('close', function(){
			console.log("App extracted to /" + appfoldername);
			fs.removeSync(downloadedapp);
			if(decision === 3){
				checkForInstallation(appfoldername);
			}
			else{
				console.log("Closing script. Have fun developing!");
			}
		})
	})
}

// function that runs the app through barebone
function runApp(session, appfoldername){
		var dataCallback;
		console.log("Installation found, using it to run...");
		console.log("Running the app using Backbone...");
		// dataCallback = function(data) {
		//   console.log(data);
		// };
		// nrc.run('node foreground/main.js sessionID=' + session + ' appRoot=./../'+ appfoldername +'/background mode=barebone', { onData: dataCallback });

		// var myRunCommand = exec('node foreground/main.js sessionID=' + session + ' appRoot=./../'+ appfoldername +'/background mode=barebone');
		// myRunCommand.stdout.on('data', function(data) {
		// 	console.log(data);
		// });
		// myRunCommand.on('close', function (code) {
  	// 	console.log('Closing code: ' + code);
		// });
		console.log('node foreground/main.js sessionID=' + session + ' appRoot=./../'+ appfoldername +'/background mode=barebone');
		nrc.run('node foreground/main.js sessionID=' + session + ' appRoot=./../'+ appfoldername +'/background mode=barebone', { onData: dataCallback });
		dataCallback = function(data) {
			//this should print out every line printed out from the child "nrc.run"
			console.log("hello");
			console.log(data);
		};
		// console.log(dataCallback);
}

// Check if the version has existing installation and use it if it does, create one if doesn't
function checkForInstallation(appfoldername){
	console.log("Checking if installation exists...");
	request({
							url: "http://" + targetip +":9292/services/installation?this_version_id=" + items[rightanswer][':id'] + "&expand=0",
							method: "GET",
							json: true,
							headers: {
								'Accept': 'application/json',
								'Content-Type': 'application/json',
								'X-Session': xsession
						}
					},  function (error, response, body){
						//console.log(body);
						if (typeof body[0] != 'undefined' && body[0] !== null){
   						runApp(body[0].session, appfoldername);
						}
						else{
							console.log("No installation found. Redirecting...");
							createInstallation(appfoldername);
						}
					});
}

// makes the request that creates an installation for the specific version
function createInstallation(appfoldername){
	console.log('Creating installation...');
	request({
				 url: "http://" + targetip +":9292/services/installation",
				 method: "POST",
				 json: true,
				 body: {
					 "application": items[rightanswer][':id'],
					 ":type": "urn:seluxit:xml:wappsto:installation-1.2"
				 },
				 headers: {
					 'Accept': 'application/json',
					 'Content-Type': 'application/json',
					 'X-Session': xsession
				 }

		 }, function (error, response, body){
			 console.log(body);
			 if (error){
				console.log("Error came up. Try again later. Response from server is:");
 			  console.log(body.message);
				console.log(error);
			 }
			 else{
			  runApp(body['session'], appfoldername);
			 }
	 });

}

// searches for all local versions of all local apps
function searchManifestFiles(localpath) {
		var manifests = [];
    fs.readdirSync(localpath).forEach(function (name) {
        var filePath = path.join(localpath, name);
        var stat = fs.statSync(filePath);
        if (stat.isFile() && name === "manifest.json") {
            manifests.push(filePath);
						//console.log(filePath);
        } else if (stat.isDirectory()) {
            manifests.push.apply(manifests, searchManifestFiles(filePath));
        }
    });
		return manifests;
}

// Ask user if he wants to download the version even though he has it locally
function askIfReplaceApp(app, decision, appfoldername){
	if (decision === 2)
	{
		console.log("The app was already found in local folder. Would you like to download the one on the server?");
		console.log("[1] Yes");
		console.log("[2] No");
		questions.askMany({
		    answer: { info:'Your option: ', required: true},
		}, function(result){
				switch(result.answer){
					case "1":
						console.log("You selected 1");
						downloadSpecificApp(app, decision);
						break;
					case "2":
						console.log("You selected 2");
						displayApps(decision);
						break;
					default:
						console.log("Wrong input");
						askIfReplaceApp(app, decision, appfoldername);
						break;
				}
		})
	} else {
		console.log("The app was already found in this folder. Would you like to run the local version or the one on the server?");
		console.log("[1] The local version");
		console.log("[2] The server version");
		console.log("[3] Go back to my apps");
		questions.askMany({
		    answer: { info:'Your option: ', required: true},
		}, function(result){
				switch(result.answer){
					case "1":
						console.log("Running the local version");
						checkForInstallation(appfoldername);
						break;
					case "2":
						console.log("You chose to run the server version.");
						askConfirmationReplace(app, decision);
						break;
					case "3":
						console.log("Going back to your apps");
						displayApps(decision);
						break;
					default:
						console.log("Wrong input");
						askIfReplaceApp(app, decision, appfoldername);
						break;
				}
		})
	}

}

// Ask user to confirm his choice and let know of consequences.
function askConfirmationReplace(app, decision){
	console.log("Warning: This can lead into having duplicate files. Are you sure you want to download the server version?");
	console.log("[1] Yes");
	console.log("[2] No");
	questions.askMany({
	    answer: { info:'Your option: ', required: true},
	}, function(result){
			switch(result.answer){
				case "1":
					console.log("Downloading server version...");
					downloadSpecificApp(app, decision);
					break;
				case "2":
					console.log("You selected 2");
					displayApps(decision);
					break;
				default:
					console.log("Wrong input");
					askIfReplaceApp(app, decision, appfoldername);
					break;
			}
	})
}

// function that checks if the value is int or not, returns true / false
function isInt(value) {
  return !isNaN(value) &&
         parseInt(Number(value)) == value &&
         !isNaN(parseInt(value, 10));
}

// asks which app to go forward with.
function askUserInput(decision){
	questions.askMany({
		answer: {info:'Introduce the number correspondingly: ', required: true},
		}, function(result){
			rightanswer = result.answer;
			if (isInt(rightanswer) && rightanswer < itemnumber+1){
				if (decision == 5){
					deleteSelectedVersion();
				} else if (decision == 6) {
					deleteSelectedApp();
				} else
				{
					console.log("You selected " + "["+rightanswer+"] "+ items[rightanswer]['name']);
					downloadApp(decision);
				}
			}
			else {
				console.log("Select something in range");
				askUserInput(decision);
			}
		})
}

// Makes a request that deletes the selected version
function deleteSelectedVersion(){
	if(items[rightanswer][':id']){
		request({
					 url: "http://" + targetip + ":9292/services/version/" + items[rightanswer][':id'],
					 method: "DELETE",
					 json: true,
					 headers: {
						 'Accept': 'application/json',
						 'Content-Type': 'application/json',
						 'X-Session': xsession
					 }

			 }, function (error, response, body){
				 //console.log(body);
				 if (error){
					 console.log(error);
				 }
				 else {
					 console.log(body.message);
					 requestDecision();
				 }
			});
	} else {
		console.log("Something went wrong");
	}
}

// Makes a request that deletes the whole app and all the versions under it
function deleteSelectedApp(){
	request({
				 url: "http://" + targetip + ":9292/services/application/" + items[rightanswer][':id'],
				 method: "DELETE",
				 json: true,
				 headers: {
					 'Accept': 'application/json',
					 'Content-Type': 'application/json',
					 'X-Session': xsession
				 }

		 }, function (error, response, body){
			 //console.log(body);
			 if (error){
				 console.log(error);
			 }
			 else {
				 console.log(body.message);
				 requestDecision();
			 }
		});
}

// Ask user what kind of app he wants, background/foreground/both
function generateApp(){
		console.log("What would you like your new app to include?");
		console.log("[1] background folder");
		console.log("[2] foreground folder");
		console.log("[3] background and foreground folders");
		questions.askMany({
				answer: { info:'Your answer: ', required: true},
		}, function(result){
				switch(result.answer){
					case "1":
						console.log("Generating background folder...");
						generateBackgroundFolder();
						break;
					case "2":
						console.log("Generating foreground folder...");
						generateForegroundFolder();
						break;
					case "3":
						console.log("Generating background and foreground folder...");
						generateBothFolders();
						break;
					default:
						console.log("Wrong input");
						generateApp();
						break;
				}
		})
}

// Generates both foreground and background folders inside App. Checks if it already exists first.
// Generates both main.js and index.html, the base files from each foreground/background.
function generateBothFolders(){
	if (fs.existsSync('App')) {
			console.log('App folder already exists.');
	} else
	{
		fs.mkdirSync('App');
		console.log('App folder created');
	}
	if (fs.existsSync('App/background')) {
			console.log('background folder inside /App already exists.');
	}
	else
	{
		fs.mkdirSync('App/background');
		console.log('background folder created');
	}
	if (fs.existsSync('App/foreground')) {
			console.log('foreground folder inside /App already exists.');
	}
	else
	{
		fs.mkdirSync('App/foreground');
		console.log('foreground folder created');
	}
	if (fs.existsSync('App/background/main.js')) {
			console.log('main file inside /App/background/ already exists.');
	} else
	{
		var stream = fs.createWriteStream("App/background/main.js");
		stream.once('open', function(fd) {
		stream.write("console.log(\"Hello there!\");\n");
		stream.write("console.log(\"This is your new app\");\n");
		stream.write("console.log(\"Have fun developing!\");\n");
		stream.end();
		});
	}
	if (fs.existsSync('App/foreground/index.html')) {
			console.log('index file inside /App/foreground/ already exists.');
	} else
	{
		var stream2 = fs.createWriteStream("App/foreground/index.html");
		stream2.once('open', function(fd) {
		stream2.write("<!DOCTYPE html>\n");
		stream2.write("<html>\n");
		stream2.write("<body> <h1>This is your starting html. Have fun!</h1> </body>\n");
		stream2.write("</html>\n");
		stream2.end();
		});
	}
	console.log('App folder generated and ready for development');
	askIfRegisterNewApp(3);

}

// Checks if app folder exists and if not, creates the folder. same with background and main.js inside it
// For main.js it generates sample console logs.
function generateBackgroundFolder(){
	if (fs.existsSync('App')) {
			console.log('App folder already exists.');
	} else
	{
		fs.mkdirSync('App');
		console.log('App folder created');
	}
	if (fs.existsSync('App/background')) {
			console.log('background folder inside /App already exists.');
	}
	else
	{
		fs.mkdirSync('App/background');
		console.log('background folder created');
	}
	if (fs.existsSync('App/background/main.js')) {
			console.log('main file inside /App/background/ already exists.');
	} else
	{
		var stream = fs.createWriteStream("App/background/main.js");
		stream.once('open', function(fd) {
			stream.write("console.log(\"Hello there!\");\n");
			stream.write("console.log(\"This is your new app\");\n");
			stream.write("console.log(\"Have fun developing!\");\n");
			stream.end();
		});
		console.log('App folder generated and ready for development');
	}
	askIfRegisterNewApp(1);

}

// Checks if app folder exists and if not, creates the folder. same with foreground and index.html inside it
// For index.html it generates sample body with a simple header.
function generateForegroundFolder(){
	if (fs.existsSync('App')) {
			console.log('App folder already exists.');
	} else
	{
		fs.mkdirSync('App');
		console.log('App folder created');
	}
	if (fs.existsSync('App/foreground')) {
			console.log('foreground folder inside /App already exists.');
	}
	else
	{
		fs.mkdirSync('App/foreground');
		console.log('foreground folder created');
	}
	if (fs.existsSync('App/foreground/index.html')) {
			console.log('index file inside /App/foreground already exists.');
	} else
	{
		var stream = fs.createWriteStream("App/foreground/index.html");
		stream.once('open', function(fd) {
		stream.write("<!DOCTYPE html>\n");
		stream.write("<html>\n");
		stream.write("<body> <h1>This is your starting html. Have fun!</h1> </body>\n");
		stream.write("</html>\n");
		stream.end();
		});
		console.log('App folder generated and ready for development');
	}
	askIfRegisterNewApp(2);

}

// Ask user if he wants to register the app.
function askIfRegisterNewApp(number){
	console.log("Would you like to register your new app?");
	console.log("[1] Yes");
	console.log("[2] No");
	questions.askMany({
			answer: { info:'Your answer: ', required: true},
	}, function(result){
			switch(result.answer){
				case "1":
					console.log("You selected yes");
					// Make function that generates manifest json file
					generateNewManifestFile(number);
					break;
				case "2":
					console.log("You selected no");
					console.log("End of script. Have fun developing!");
					break;
				default:
					console.log("Wrong input");
					askIfRegisterNewApp(number);
					break;
			}
	})
}

// Create the new app manifest file according to user input
function generateNewManifestFile(number){
	console.log("We need some info regarding your new app");
	questions.askMany({
	name: { info:'Name: ', required: true},
	version: { info:'Starting version: ', required: true},
	title: { info:'Title: ', required: true},
	price: { info:'Price: ', required: true},
	description: { info:'Description: ', required: true},
	author: { info:'Author: ', required: true},
}, function(result){
	if (number == 1) {
		var supported_features = ["background"];
		var tempfile = [{
			":type": "urn:seluxit:xml:wappsto:file-1.2",
			name: "main.js",
			type: "js",
			use: "background"
		}]
	}
	if (number == 2) {
		var supported_features = ["foreground"];
		var tempfile = [{
			":type": "urn:seluxit:xml:wappsto:file-1.2",
			name: "index.html",
			type: "html",
			use: "foreground"
		}]
	}
	if (number == 3) {
		var supported_features = ["background", "foreground"];
		var tempfile = [{
      ":type": "urn:seluxit:xml:wappsto:file-1.2",
      name: "main.js",
      type: "js",
      use: "background"
    },{
      ":type": "urn:seluxit:xml:wappsto:file-1.2",
      name: "index.html",
      type: "html",
      use: "foreground"
    }]
	}
	var newmanifest = {
			":type": "urn:seluxit:xml:wappsto:application-1.2",
		  "version": [{
		    ":type": "urn:seluxit:xml:wappsto:version-1.2",
		    "name": result.name,
		    "author": result.author,
		    "supported_features" : supported_features,
		    "version_app": result.version,
		    "node_version": process.version,
		    "title": result.title,
		    "description": {
		      "general": result.description
		    },
		    "price": parseInt(result.price),
		    "file": tempfile
		  }]
	}
	requestNewApp(newmanifest, number);
})

}

// Makes the request that registers the new app on wappsto and uploads the sample files
function requestNewApp(manifest, number){
    request({
       url: "http://" + targetip + ":9292/services/application",
       method: "POST",
       json: true,
       body: manifest,
       headers: {
         'Accept': 'application/json',
         'Content-Type': 'application/json',
         'X-Session': xsession
       }

   }, function (error, response, body){
		 if (error || body.message){
			 console.log(error);
			 console.log(body.message);
			 console.log("Some input was wrong. Try again:");
			 generateNewManifestFile(number);
		 }
		 else {
			 if (number == 1 || number == 2) {
				 if (number == 1) var targetfolder = "background";
				 if (number == 2) var targetfolder = "foreground";
				 request({
							 url: "http://" + targetip + ":3005/file/"+ body.version[0].file[0][':id'],
							 method: "PUT",
							 body: fs.readFileSync("App/" + targetfolder + "/" +body.version[0].file[0]['name'] , 'utf8'),
							 headers: {
								 'Accept': 'application/json',
								 'Content-Type': 'application/json',
								 'X-Session': xsession
							 }

					 }, function (error, response, body2){
						if(error){
							console.log(error);
						} else{
							//console.log(body);
							fs.writeFile('App/manifest.json', JSON.stringify(body['version'][0], null, '\t'), 'utf-8');
							fs.renameSync('App', body.version[0]['name']);
							console.log("file added");
						}
					 });
			 } else {
				 // code to update both foreground and background
				 request({
							 url: "http://" + targetip + ":3005/file/"+ body.version[0].file[0][':id'],
							 method: "PUT",
							 body: fs.readFileSync("App/background/main.js", 'utf8'),
							 headers: {
								 'Accept': 'application/json',
								 'Content-Type': 'application/json',
								 'X-Session': xsession
							 }

					 }, function (error, response, body2){
						if(error){
							console.log(error);
						} else{
							//console.log(body);
							console.log("background file created");
						}
					 });
					 request({
								 url: "http://" + targetip + ":3005/file/"+ body.version[0].file[1][':id'],
								 method: "PUT",
								 body: fs.readFileSync("App/foreground/index.html", 'utf8'),
								 headers: {
									 'Accept': 'application/json',
									 'Content-Type': 'application/json',
									 'X-Session': xsession
								 }

						 }, function (error, response, body2){
							if(error){
								console.log(error);
							} else{
								//console.log(body);
								fs.writeFile('App/manifest.json', JSON.stringify(body['version'][0], null, '\t'), 'utf-8');
								fs.renameSync('App', body.version[0]['name']);
								console.log("foreground file created");
							}
						 });
			 }
		 }
  });
}

// This moves the extracted barebone, removes the previous folder and performs npm install in the barebone folder
function prepareForeground(){
	return new Promise((resolve, reject) => {
		fs.moveSync('unzipped/foreground', 'foreground', {overwrite:true})
		console.log('Files Moved!');
		fs.removeSync('unzipped');
		console.log('temp folder deleted');
		console.log('preparing foreground folder - installing npm');
		nrc.run('npm install --prefix ./foreground');
		resolve();
		})
		.then(()=>{
			requestDecision()
		}, (err) => {
			console.log("Something went wrong moving files. Try again. If this fails again, try manually deleting the foreground folder and run again")
		})
}

// Downloads the latest barebone, extracts the zip file and deletes the zip file afterwards.
function getBarebone(){
	return new Promise((resolve, reject) => {
			console.log('Getting Latest Barebone');
			request({
							url: "http://" + targetip +":3005/file/" + bareboneversion,
							method: "GET",
							encoding: null,
							headers: {
								'Accept': 'application/json',
								'Content-Type': 'application/json',
								'X-Session': xsession
						}
					},  function (error, response, body){
						if(error){
							console.log("Failed to download files. Try again.");
							reject();
						}
						fs.writeFile(output, body, function(err) {
							console.log("Barebone Downloaded!");
							var x = fs.createReadStream(output);
							x.pipe(unzip.Extract({ path: './unzipped/' }))
							.on('close', function(){
								console.log("Barebone extracted to /unzipped");
								fs.removeSync(output);
								//console.log('zip file deleted');
								resolve();
							})
						});
					});
				})
				.then(()=>{
						prepareForeground()
				}, (err) => {
					console.log("Something went wrong downloading barebone. Try again.")
				})
}

// Makes a request to get the ID of the latest Barebone version
function getBareboneVersion(){
	return new Promise((resolve, reject) => {
			console.log('Logged in, getting the barebone file version...');
			request({
					url: "http://" + targetip +":9292/services/search?request=Barebone-Docker",
					method: "GET",
					json: true,
					headers: {
						'Accept': 'application/json',
						'Content-Type': 'application/json',
						'X-Session': xsession
				}
			},  function (error, response, body){
				//console.log(body);
					if(!response.body.version) {
						return console.log("Failed to get latest version of Barebone. Try again.");
						reject();
					}
						//bareboneversion = response.body.version.slice(-1).pop()[':id'];
						var latestdate = "2000-01-01T00:00:00.500+01:00";
						var latestversion;
						for (i = 0; i<body.version.length; i++){
							//console.log(body.version[i]['date']);
							if(body.version[i]['date'] > latestdate){
								latestdate = body.version[i]['date'];
								latestversion = body.version[i];
							}
						}
						bareboneversion = latestversion[':id'];
						//console.log("Latest: "+latestdate);
						console.log('Newest barebone version: ' + bareboneversion);
						resolve();
				});
	})
	.then(() => {
		getBarebone()
	})
}

// check all local apps
function checkLocalApps(decision){
	var itemstoupload = 0;
	var pathstomanifest = [];
	var found = false;
	console.log("Which app would you like to upload?");
	pathstomanifest = searchManifestFiles('./')
	if (pathstomanifest.length > 0){
		pathstomanifest.forEach(function(path){
			var eachmanifest = JSON.parse(fs.readFileSync(path, 'utf8'));
			console.log('[' + itemstoupload + '] ' +eachmanifest['name']);
			itemstoupload++;
		})
	}
	else{
		console.log("No apps found locally.");
		requestDecision();
	}

	questions.askMany({
		answer: {info:'Your pick: ', required: true},
		}, function(result){
			var useranswer = result.answer;
			if (isInt(useranswer) && useranswer < itemstoupload){
				var selectedManifest = JSON.parse(fs.readFileSync(pathstomanifest[useranswer], 'utf8'));
				console.log("You selected " + "["+useranswer+"] "+ selectedManifest['name']);
				console.log("Would you like to replace current app version or upload under new version?");
				console.log("[1] Replace current version on the server");
				console.log("[2] Upload under new version");
				questions.askMany({
				    answer: { info:'Your pick: ', required: true},
				}, function(result){
				    //console.log(result);
						switch(result.answer){
							case "1":
								//upload function overwrite
								updateManifestWithFiles(selectedManifest, pathstomanifest[useranswer]);
								break;
							case "2":
								verifyManifestVersion(selectedManifest, pathstomanifest[useranswer]);
								break;
							default:
								console.log("Wrong input");
								checkLocalApps(decision);
								break;
						}
				})
			}
			else {
				console.log("Select something in range");
				checkLocalApps(decision);
			}
		})

}

// gets newest manifest, add each file to the manifest file[] if it doesn't exist yet.
function updateManifestWithFiles(manifest, pathToManifest){
	request({
			url: "http://" + targetip +":9292/services/version/" + manifest[':id'] +"?expand=2",
			method: "GET",
			json: true,
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
				'X-Session': xsession
		}
	},  function (error, response, body){
		fs.writeFileSync(pathToManifest, JSON.stringify(body, null, '\t'), 'utf-8');
		var modifiedmanifest = body;
		var pathtofolder = pathToManifest.slice(0, -13);
		var paths = [];
		//pathtofolder = pathtofolder;
		if (fs.existsSync(pathtofolder + '/background')) {
			paths = paths.concat(checkAllFileNamePathsBackground(pathtofolder));
		}
		if (fs.existsSync(pathtofolder + '/foreground')) {
			paths = paths.concat(checkAllFileNamePathsForeground(pathtofolder));
		}
		var filesFromManifest = body.file;
		var pathsToNewFiles = [];
		var areThereNewFiles = false;
		paths.forEach(function(fullpath){
			console.log(fullpath);
			console.log(path.posix.basename(path.posix.dirname(fullpath)));
			var found = _.findWhere(filesFromManifest, {"name": path.posix.basename(fullpath), "use": path.posix.basename(path.posix.dirname(fullpath))});
			if (found){
				updateExistingFiles(fullpath, found);
			}
			else {
				var directory = path.dirname(fullpath).split('/')[path.dirname(fullpath).split('/').length - 1];
				console.log(directory);
				if(directory == "background"){
					modifiedmanifest['file'].push({
						":type": "urn:seluxit:xml:wappsto:file-1.2",
						name: path.posix.basename(fullpath),
						type: path.extname(fullpath).slice(1, path.extname(fullpath).length),
						use: "background"
					})
					pathsToNewFiles.push(fullpath);
					areThereNewFiles = true;
				} else if (directory == "foreground"){
					modifiedmanifest['file'].push({
						":type": "urn:seluxit:xml:wappsto:file-1.2",
						name: path.posix.basename(fullpath),
						type: path.extname(fullpath).slice(1, path.extname(fullpath).length),
						use: "foreground"
					})
					pathsToNewFiles.push(fullpath);
					areThereNewFiles = true;
				}
			}
		})
		if (areThereNewFiles){
			var manifestAppID = modifiedmanifest['application'];
			delete modifiedmanifest['application'];
			delete modifiedmanifest['owner'];
			createNewFilesOnServer(modifiedmanifest, pathsToNewFiles, manifestAppID, pathToManifest);
		}
	});
}

// request that modifies the version on the server to include some empty files
// then as callback upload content to each file.
function createNewFilesOnServer(version, pathsToNewFiles, manifestAppID, pathToManifest){
	request({
			url: "http://" + targetip +":9292/services/application/"+ manifestAppID +"/version/" + version[':id'],
			method: "PUT",
			json: true,
			body: version,
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
				'X-Session': xsession
		}
	},  function (error, response, body){
		fs.writeFile(pathToManifest, JSON.stringify(body, null, '\t'), 'utf-8');
		//console.log(body);
		pathsToNewFiles.forEach(function(fullpath){
			//console.log(fullpath);
			var found = _.findWhere(body.file, {"name": path.basename(fullpath)});
			if (found){
				//console.log(found);
				request({
							url: "http://" + targetip + ":3005/file/"+found[':id'],
							method: "PUT",
							body: fs.readFileSync(fullpath, 'utf8'),
							headers: {
								'Accept': 'application/json',
								'Content-Type': 'application/json',
								'X-Session': xsession
							}

					}, function (error, response, body){
						//console.log("3 - " + body);
						if (error){
							console.log(error);
						}
							console.log("new file added");
						});
			}
		})
	});

}

// function that uploads content to a specific file on fileserver
function updateExistingFiles(pathtofile, file){
	request({
				url: "http://" + targetip + ":3005/file/"+file[':id'],
				method: "PUT",
				body: fs.readFileSync(pathtofile, 'utf8'),
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json',
					'X-Session': xsession
				}

		}, function (error, response, body){
			if (error){
				console.log(error);
			}
				console.log("existing file updated");
			});
}

// check the current version in manifest file and then overwrite it with user's version
function verifyManifestVersion(manifest, temppath){
	console.log("Current app version: " + manifest['version_app']);
	questions.askMany({
		answer: {info:'New version: ', required: true},
		}, function(result){
			var useranswer = result.answer;
			if (isValidVersion(useranswer)){
				var modifiedmanifest = manifest;
				console.log("Version accepted!");
				modifiedmanifest['version_app'] = useranswer;
				//console.log(useranswer);
				var pathtofolder = temppath.slice(0, -13);
				// if(manifest.supported_features.length == 1){
				// 	pathtofolder = pathtofolder + manifest.supported_features[0] + "/";
				// }
				var paths = [];
				if (fs.existsSync(pathtofolder + '/background')) {
					paths = paths.concat(checkAllFileNamePathsBackground(pathtofolder));
				}
				if (fs.existsSync(pathtofolder + '/foreground')) {
					paths = paths.concat(checkAllFileNamePathsForeground(pathtofolder));
				}
				// var paths = checkAllFileNamePathsBackground(pathtofolder);
				// paths.push(checkAllFileNamePathsForeground(pathtofolder));
				modifiedmanifest['file'] = [];
				var appidmanifest = modifiedmanifest['application'];


				paths.forEach(function(file){
					var directory = path.dirname(file).split('/')[path.dirname(file).split('/').length - 1];
					//console.log(directory);
					if (directory == "background"){
						modifiedmanifest = addFilesToManifestBackground(file, modifiedmanifest);
					} else if (directory == "foreground"){
						modifiedmanifest = addFilesToManifestForeground(file, modifiedmanifest);
					} else {
						console.log("Found invalid folder names");
					}
					//modifiedmanifest = addFilesToManifest(file, modifiedmanifest);
					//console.log(manifest + "inside foreach");
				})
				//console.log(modifiedmanifest);
				fs.writeFileSync(temppath, JSON.stringify(manifest, null, '\t'), 'utf-8');
				delete modifiedmanifest['application'];
				delete modifiedmanifest[':id'];
				delete modifiedmanifest['owner'];
				createEmptyFilesOnServer(modifiedmanifest, appidmanifest, paths);
				//console.log(paths);
			}
			else {
				console.log("Wrong version input");
				verifyManifestVersion(manifest);
			}
		})

}

// first request creates the empty files in the server (files found)
// 2nd request puts content in the corresponding files, by id.
function createEmptyFilesOnServer(modifiedmanifest, appidmanifest, paths){
	//console.log(appidmanifest);
	request({
				 url: "http://" + targetip + ":9292/services/application/" + appidmanifest + "/version",
				 method: "POST",
				 json: true,
				 body: modifiedmanifest,
				 headers: {
					 'Accept': 'application/json',
					 'Content-Type': 'application/json',
					 'X-Session': xsession
				 }

		 }, function (error, response, body){
				var pathtofolder2 = path.dirname(path.dirname(paths[0]));
				 body.file.forEach(function(file){
					 request({
			           url: "http://" + targetip + ":3005/file/"+file[':id'],
			           method: "PUT",
			           body: fs.readFileSync(pathtofolder2+ "/" + file['use'] + "/" + file['name'], 'utf8'),
			           headers: {
			             'Accept': 'application/json',
			             'Content-Type': 'application/json',
			             'X-Session': xsession
			           }

			       }, function (error, response, body){
							 if (error){
								 console.log(error);
							 }
							 	 console.log("files updated");
			         });
				 })
			 });

}


// returns an array of paths to each file in background folder
function checkAllFileNamePathsBackground(pathtofolder){
	pathtofolder = pathtofolder + "background/";
	filestoupload = [];
	fs.readdirSync(pathtofolder).forEach(function (name) {
			var filePath = path.join(pathtofolder, name);
			var stat = fs.statSync(filePath);
			if (stat.isFile()) {
					filestoupload.push(filePath);
			} else if (stat.isDirectory()) {
					filestoupload.push.apply(filestoupload, checkAllFileNamePathsBackground(filePath));
			}
	});
		return filestoupload;
}

// returns an array of paths to each file in foreground folder
function checkAllFileNamePathsForeground(pathtofolder){
	pathtofolder = pathtofolder + "foreground/";
	filestoupload = [];
	fs.readdirSync(pathtofolder).forEach(function (name) {
			var filePath = path.join(pathtofolder, name);
			var stat = fs.statSync(filePath);
			if (stat.isFile()) {
					filestoupload.push(filePath);
			} else if (stat.isDirectory()) {
					filestoupload.push.apply(filestoupload, checkAllFileNamePathsForeground(filePath));
			}
	});
		return filestoupload;
}

// for each file found in background, add them to manifest
function addFilesToManifestBackground(file, manifest){
	//console.log(manifest['files']);
	manifest['file'].push({
		":type": "urn:seluxit:xml:wappsto:file-1.2",
		name: path.posix.basename(file),
		type: path.extname(file).slice(1, path.extname(file).length),
		use: "background"
	})
	return manifest;
}

// for each file found in foreground, add them to manifest
function addFilesToManifestForeground(file, manifest){
	//console.log(manifest['files']);
	manifest['file'].push({
		":type": "urn:seluxit:xml:wappsto:file-1.2",
		name: path.posix.basename(file),
		type: path.extname(file).slice(1, path.extname(file).length),
		use: "foreground"
	})
	return manifest;
}

// simple function that checks the format of the version
function isValidVersion(version){
	var splitted = version.split('.');
	return splitted.every(isInt);
	//console.log(splitted.every(isInt));
}

// "main" function of this script, a lot of redirects lead there
// this asks the user what is he willing to do next, and sends him into corresponding function
function requestDecision(){
	console.log("What would you like to do?");
	console.log("[1] Create new App");
	console.log("[2] Download one of your Apps");
	console.log("[3] Run one of your Apps");
	console.log("[4] Upload one of your Apps");
	console.log("[5] Delete a version or an app from the server");
	questions.askMany({
	    answer: { info:'Your answer: ', required: true},
	}, function(result){
	    //console.log(result);
			switch(result.answer){
				case "1":
					//console.log("You selected 1");
					generateApp();
					break;
				case "2":
					//console.log("You selected 2");
					displayApps(2);
					break;
				case "3":
					//console.log("You selected 3");
					displayApps(3);
					break;
				case "4":
					//console.log("You selected 4");
					checkLocalApps(4);
					break;
				case "5":
					//console.log("You selected 5");
					requestWhatToDelete();
					break;
				default:
					console.log("Wrong input");
					requestDecision();
					break;
			}
	})
}

// let user decide if he wants to delete only a version or a whole app
function requestWhatToDelete(){
	console.log("What would you like to delete?");
	console.log("[1] An app (and every version under it)");
	console.log("[2] A version");

	questions.askMany({
			answer: { info:'What would you like to delete? ', required: true},
	}, function(result){
			//console.log(result);
			switch(result.answer){
				case "1":
					console.log("You selected to delete an app");
					//generateApp();
					displayApps(6);
					break;
				case "2":
					console.log("You selected to delete a version");
					displayApps(5);
					break;
				default:
					console.log("Wrong input");
					requestWhatToDelete();
					break;
			}
	})

}

// The request that logs in and saves your xsession as a global var
function postLogin(saved){
	return new Promise((resolve, reject) => {
	    console.log('Logging in..');
	    request({
	           url: "http://" + targetip +":9292/services/session",
	           method: "POST",
	           json: true,
	           body: login,
	           headers: {
	             'Accept': 'application/json',
	             'Content-Type': 'application/json'
	           }

	       }, function (error, response, body){
	          xsession = response.body[':id'];
						if(!xsession) {
 						return console.log("Failed to login. Try again.");
 						reject();
					 	}
						if (!saved){
							askToSaveLoginDetails();
						} else {
							console.log('Your X-Session: ' +xsession);
		          resolve();
						}
	         });
	})
	.then(() => {
		getBareboneVersion()
	})
}

// Writes the config file inside cfg folder, saving the username and password for future logins
function askToSaveLoginDetails(){
	console.log('Login successfully!');
	console.log('Would you like to remember login info?');
	console.log('[1] Yes');
	console.log('[2] No');
	questions.askMany({
	answer: { info:'Your answer: ', required: true},
	}, function(result){
		// code to do with answer
		switch(result.answer){
			case "1":
				console.log("You selected yes");
				// save password to file
				if (fs.existsSync('cfg')){
					fs.writeFileSync('./cfg/config.json', JSON.stringify(login, null, '\t'), 'utf-8');
					getBareboneVersion();
				} else {
					fs.mkdirSync('cfg');
					fs.writeFileSync('./cfg/config.json', JSON.stringify(login, null, '\t'), 'utf-8');
					getBareboneVersion();
				}
				break;
			case "2":
				console.log("You selected no");
				getBareboneVersion();
				// do nothing
				break;
			default:
				console.log("Wrong input");
				askToSaveLoginDetails();
				break;
		}
	})
}

// read config file, if it doesn't exist then ask for login info
function requestLoginInput(){
	return new Promise((resolve, reject) => {
		if (fs.existsSync('./cfg/config.json')){
			console.log("Reading config file..");
			var loginDetails = JSON.parse(fs.readFileSync('./cfg/config.json', 'utf8'));
			login.username = loginDetails.username;
			login.password = loginDetails.password;
			var saved = true;
			resolve(saved);
		} else {
			console.log('Let\'s login: ');
		  questions.askMany({
		  email: { info:'User email: ', required: true},
		  password: { info:'User password: ', required: true},
		 }, function(result){
		  //console.log(result);
		  login.username = result.email;
		  login.password = result.password;
			var saved = false;
			resolve(saved);
		 })
		}
	})
	.then((saved) => {
		postLogin(saved)
	})
}
