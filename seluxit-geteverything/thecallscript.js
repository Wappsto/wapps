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
var cmd=require('node-cmd');
var questions = require('questions');
var xsession;
var bareboneversion;
var output = "downloadedfile.zip";
var downloadedapp = "downloadedapp.zip";
var items = [];
var rightanswer;
var itemnumber = 0;
const targetip = '10.10.2.21';
//
//
// // the login json file
var login = {
	"username": "a@a.a", //still here for the purpose of easier testing (just comment out line 34-35 to have it hardcodded)
	"password": "aaa",
	":type": "urn:seluxit:xml:wappsto:session-1.2"
}

requestLoginInput()

.catch((err) => {
	console.log(err);
	console.log('Error came up.');
})

function displayApps(){
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
					askUserInput();
		});
}

function downloadApp(){
	return new Promise((resolve, reject) => {
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
							reject();
						}
						fs.writeFile(downloadedapp, body, function(err) {
							console.log("App Downloaded!");
							// fs.createReadStream(downloadedapp).pipe(unzip.Extract({ path: './yourApp/' }))
							var x = fs.createReadStream(downloadedapp);
							x.pipe(unzip.Extract({ path: './yourApp/' }))
							.on('close', function(){
								console.log("App extracted to /yourApp");
								fs.removeSync(downloadedapp);
								resolve();
							})
							})
						});
					});
}


function isInt(value) {
  return !isNaN(value) &&
         parseInt(Number(value)) == value &&
         !isNaN(parseInt(value, 10));
}

function askUserInput(){
	questions.askMany({
		answer: {info:'Introduce the number correspondingly: ', required: true},
		}, function(result){
			rightanswer = result.answer;
			if (isInt(rightanswer) && rightanswer < itemnumber+1){
				console.log("You selected " + "["+rightanswer+"] "+ items[rightanswer]['name']);
				downloadApp();
			}
			else {
				console.log("Select something in range");
				askUserInput();
			}
		})
}


function generateApp(){
	return new Promise((resolve, reject) => {
		if (fs.existsSync('App')) {
				console.log('App folder already exists.');
		} else
		{
			fs.mkdirSync('App');
			console.log('App folder created');
		}
		if (fs.existsSync('App/main.js')) {
				console.log('main file inside /App already exists.');
		} else
		{
			var stream = fs.createWriteStream("App/main.js");
			stream.once('open', function(fd) {
			stream.write("console.log(\"Hello there!\");\n");
			stream.write("console.log(\"This is your new app\");\n");
			stream.write("console.log(\"Have fun developing!\");\n");
			stream.end();
			});
		}
		resolve();
	})
	.then(() => {
		displayApps();
	})
}

function prepareForeground(){
	return new Promise((resolve, reject) => {
		fs.moveSync('unzipped/foreground', 'foreground', {overwrite:true})
		console.log('Files Moved!');
		fs.removeSync('unzipped');
		console.log('temp folder deleted');
		console.log('preparing foreground folder - installing npm');
		cmd.run('npm install --prefix ./foreground');
		resolve();
		})
		.then(()=>{
			generateApp()
		}, (err) => {
			console.log("Something went wrong moving files. Try again. If this fails again, try manually deleting the foreground folder and run again")
		})
}

function getBarebone(){
	return new Promise((resolve, reject) => {
			console.log('Getting Latest Files');
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
							console.log("Files Downloaded!");
							var x = fs.createReadStream(output);
							x.pipe(unzip.Extract({ path: './unzipped/' }))
							.on('close', function(){
								console.log("Files extracted to /unzipped");
								fs.removeSync(output);
								console.log('zip file deleted');
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
									if(!response.body.version) {
										return console.log("Failed to get latest version of Barebone. Try again.");
										reject();
									}
										bareboneversion = response.body.version.slice(-1).pop()[':id'];
										console.log('Newest barebone version: ' + bareboneversion);
										resolve();
								});
					})
					.then(() => {
						getBarebone()
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
	    console.log(result);
			login.username = result.email; //uncomment these lines for proper login
			login.password = result.password; //comment them to get login from hardcodded login json
			resolve();
	})
	})
	.then(() => {
		postLogin()
	})
}
