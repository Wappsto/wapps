// #!/usr/bin/env node
// //const args = process.argv;
// //console.log(args);
//
// // Global vars
const http = require('http');
var fstream = require('fstream');
var fs = require('fs-extra');
var request = require('request');
var unzip = require('unzip');
var path = require('path');
var mkdir = require('mkdirp');
var nrc = require('node-run-cmd');
var questions = require('questions');
var xsession;
var bareboneversion;
var output = "downloadedfile.zip";
var downloadedapp = "downloadedapp.zip";
var items = [];
var rightanswer;
var itemnumber = 0;
var appfolder;
const targetip = '10.10.2.21';
//
//
// // the login json file
var login = {
	"username": "test@test.test", //still here for the purpose of easier testing (just comment out line 34-35 to have it hardcodded)
	"password": "test",
	":type": "urn:seluxit:xml:wappsto:session-1.2"
}

requestLoginInput()

.catch((err) => {
	console.log(err);
	console.log('Error came up.');
})

function displayApps(decision){
	itemnumber = 0;
	items = [];
		console.log('Loading your apps. Choose what you would like to open: ');
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
					response.body.forEach(function (bodyobj, appIndex){
						console.log("Application: "+appIndex+" ----------------------------------");
						bodyobj.version.forEach(function(versionobj){
							console.log("[" + itemnumber + "] " +versionobj['name'] + " --- version: " + versionobj['version_app'] + " --- status: " + versionobj['status']);
							items.push(versionobj);
							itemnumber++;
						})
					})
					askUserInput(decision);
		});
}

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
				askIfReplaceApp(body, decision);
			}
			else {
				downloadSpecificApp(body, decision)
			}
		//end checking
	});
}

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
				checkForInstallation();
			}
			else{
				console.log("Closing script. Have fun developing!");
			}
		})
	})
}


function runApp(session){
		var dataCallback;
		console.log("Installation found, using it to run...");
		console.log("Running the app using Backbone...");
		//console.log(session);
		//console.log(items[rightanswer][':id']);
		//console.log('node foreground/main.js sessionID=' + session + ' appRoot=./../'+ items[rightanswer][':id']  +'/background mode=barebone');
			dataCallback = function(data) {
			  console.log(data);
			};
			nrc.run('node foreground/main.js sessionID=' + session + ' appRoot=./../'+ appfolder  +'/background mode=barebone', { onData: dataCallback });


	// 	// create installation for it
	// 	console.log("Running the app using Backbone...");
	// 		var dataCallback = function(data) {
	// 		  console.log(data);
	// 		};
	// 		nrc.run('node foreground/main.js sessionID=' + xsession + ' appRoot=./'+ items[rightanswer][':id']  +'/background mode=barebone', { onData: dataCallback });

}

function checkForInstallation(){
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
						//console.log(body[0].session);
						if (typeof body[0] !== 'undefined' && body[0] !== null){
   						runApp(body[0].session);
						}
						else{
							console.log("No installation found. Redirecting...");
							createInstallation();
						}
					});
}

function createInstallation(){
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
			 //console.log(body);
			 if (error){
				console.log("Error came up. Try again later. Response from server is:");
 			  console.log(body.message);
				console.log(error);
			 }
			 else{
			  runApp(body['session']);
			 }
	 });

}

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

function askIfReplaceApp(app, decision){
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
						askIfReplaceApp(app, decision);
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
						checkForInstallation();
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
						askIfReplaceApp(app, decision);
						break;
				}
		})
	}

}

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
					askIfReplaceApp(app, decision);
					break;
			}
	})
}


function isInt(value) {
  return !isNaN(value) &&
         parseInt(Number(value)) == value &&
         !isNaN(parseInt(value, 10));
}

function askUserInput(decision){
	questions.askMany({
		answer: {info:'Introduce the number correspondingly: ', required: true},
		}, function(result){
			rightanswer = result.answer;
			if (isInt(rightanswer) && rightanswer < itemnumber+1){
				console.log("You selected " + "["+rightanswer+"] "+ items[rightanswer]['name']);
				downloadApp(decision);
			}
			else {
				console.log("Select something in range");
				askUserInput(decision);
			}
		})
}


function generateApp(){
		if (fs.existsSync('App')) {
				console.log('App folder already exists.');
		} else
		{
			fs.mkdirSync('App');
			console.log('App folder created');
		}
		if (fs.existsSync('App/background')) {
				console.log('background file inside /App already exists.');
		}
		else
		{
			fs.mkdirSync('App/background');
			console.log('background folder created');
		}
		if (fs.existsSync('App/background/main.js')) {
				console.log('main file inside /App already exists.');
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
		console.log("Would you like to register your new app?");
		console.log("[1] Yes");
		console.log("[2] No");
		askIfRegisterNewApp();

		//displayApps();
}

function askIfRegisterNewApp(){
	questions.askMany({
			answer: { info:'Your answer: ', required: true},
	}, function(result){
			switch(result.answer){
				case "1":
					console.log("You selected yes");
					//make function that generates manifest json file
					generateNewManifestFile();
					break;
				case "2":
					console.log("You selected no");
					console.log("End of script. Have fun developing!");
					break;
				default:
					console.log("Wrong input");
					askIfRegisterNewApp();
					break;
			}
	})
}

function generateNewManifestFile(){
	console.log("We need some info regarding your new app");
	questions.askMany({
	name: { info:'Name: ', required: true},
	version: { info:'Starting version: ', required: true},
	title: { info:'Title: ', required: true},
	price: { info:'Price: ', required: true},
	description: { info:'Description: ', required: true},
	author: { info:'Author: ', required: true},
}, function(result){
	var newmanifest = {
			":type": "urn:seluxit:xml:wappsto:application-1.2",
		  "version": [{
		    ":type": "urn:seluxit:xml:wappsto:version-1.2",
		    "name": result.name,
		    "author": result.author,
		    "supported_features" : ["background"],
		    "version_app": result.version,
		    "node_version": process.version,
		    "title": result.title,
		    "description": {
		      "general": result.description
		    },
		    "price": result.price,
		    "file": [{
		      ":type": "urn:seluxit:xml:wappsto:file-1.2",
		      name: "main.js",
		      type: "js",
		      use: "background"
		    }]
		  }]
	}
	requestNewApp(newmanifest);

})

}


function requestNewApp(manifest){
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
					 generateNewManifestFile();
				 }
				 else {
					 request({
								 url: "http://10.10.2.21:3005/file/"+ body.version[0].file[0][':id'],
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
								fs.writeFile('App/manifest.json', JSON.stringify(body['version'][0], null, '\t'), 'utf-8');
								//fs.writeFile('App/manifest.json', body.version[0], 'utf8');
								console.log("file added");
							}
						 });
				 }
      });
}

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
	}

	questions.askMany({
		answer: {info:'Your pick: ', required: true},
		}, function(result){
			var useranswer = result.answer;
			if (isInt(useranswer) && useranswer < itemstoupload){
				var selectedManifest = JSON.parse(fs.readFileSync(pathstomanifest[useranswer], 'utf8'));
				console.log("You selected " + "["+useranswer+"] "+ selectedManifest['name']);
				verifyManifestVersion(selectedManifest, pathstomanifest[useranswer]);

				//downloadApp(decision);
			}
			else {
				console.log("Select something in range");
				checkLocalApps(decision);
			}
		})

}

function verifyManifestVersion(manifest, path){
	console.log("Current app version: " + manifest['version_app']);
	questions.askMany({
		answer: {info:'New version: ', required: true},
		}, function(result){
			var useranswer = result.answer;
			if (isValidVersion(useranswer)){
				var modifiedmanifest = manifest;
				console.log("Version accepted!");
				modifiedmanifest['version_app'] = useranswer;

				var pathtofolder = path.slice(0, -13);
				pathtofolder = pathtofolder + "background/"
				console.log(pathtofolder);
				//var pathtofolder2 = path.join(pathtofolder, "foreground");
				//pathtofolder = path;
				var paths = checkAllFileNamePaths(pathtofolder);
				//console.log(manifest);

				modifiedmanifest['file'] = [];
				var appidmanifest = modifiedmanifest['application'];


				paths.forEach(function(file){
					modifiedmanifest = addFilesToManifest(file, modifiedmanifest);
					//console.log(manifest + "inside foreach");
				})
				//console.log(modifiedmanifest);
				fs.writeFileSync(path, JSON.stringify(manifest, null, '\t'), 'utf-8');
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

function createEmptyFilesOnServer(modifiedmanifest, appidmanifest, paths){
	//console.log(modifiedmanifest);
	request({
				 url: "http://10.10.2.21:9292/services/application/" + appidmanifest + "/version",
				 method: "POST",
				 json: true,
				 body: modifiedmanifest,
				 headers: {
					 'Accept': 'application/json',
					 'Content-Type': 'application/json',
					 'X-Session': xsession
				 }

		 }, function (error, response, body){
			 	//console.log(error);
			 	//console.log(body);
				var pathtofolder2 = path.dirname(paths[0]);
				//return body.version[0][file];
				 body.file.forEach(function(file){
					 // if(file['name'] == )
					 // var filetoupload = ;
					 request({
			           url: "http://10.10.2.21:3005/file/"+file[':id'],
			           method: "PUT",
			           body: fs.readFileSync(pathtofolder2+ "/" + file['name'], 'utf8'),
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



function checkAllFileNamePaths(pathtofolder){
	//console.log(pathtofolder);
	filestoupload = [];
	fs.readdirSync(pathtofolder).forEach(function (name) {
			var filePath = path.join(pathtofolder, name);
			var stat = fs.statSync(filePath);
			if (stat.isFile()) {
					filestoupload.push(filePath);
					// add to json file {}
			} else if (stat.isDirectory()) {
					filestoupload.push.apply(filestoupload, checkAllFileNamePaths(filePath));
			}
	});
		return filestoupload;

}

function addFilesToManifest(file, manifest){
	//console.log(manifest['files']);
	manifest['file'].push({
		":type": "urn:seluxit:xml:wappsto:file-1.2",
		name: path.posix.basename(file),
		type: path.extname(file).slice(1, path.extname(file).length),
		use: "background"
	})
	return manifest;
}


function isValidVersion(version){
	var splitted = version.split('.');
	return splitted.every(isInt);
	//console.log(splitted.every(isInt));
}

function requestDecision(){
	console.log("[1] Create new App");
	console.log("[2] Download one of your Apps");
	console.log("[3] Run one of your Apps");
	console.log("[4] Upload one of your Apps");
	questions.askMany({
	    answer: { info:'What would you like to do: ', required: true},
	}, function(result){
	    //console.log(result);
			switch(result.answer){
				case "1":
					console.log("You selected 1");
					generateApp();
					break;
				case "2":
					console.log("You selected 2");
					displayApps(2);
					break;
				case "3":
					console.log("You selected 3");
					displayApps(3);
					break;
				case "4":
					console.log("You selected 4");
					checkLocalApps(4);
					break;
				default:
					console.log("Wrong input");
					requestDecision();
					break;
			}
	})
}


function postLogin(){
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
	           console.log('Your X-Session: ' +xsession);
	           resolve();
	         });
	})
	.then(() => {
		getBareboneVersion()
	})
}

function requestLoginInput(){
	return new Promise((resolve, reject) => {
	    console.log('Let\'s login: ');
			questions.askMany({
	    email: { info:'User email: ', required: true},
	    password: { info:'User password: ', required: true},
	}, function(result){
	    //console.log(result);
			//login.username = result.email; //uncomment these lines for proper login
			//login.password = result.password; //comment them to get login from hardcodded login json
			resolve();
	})
	})
	.then(() => {
		postLogin()
	})
}
