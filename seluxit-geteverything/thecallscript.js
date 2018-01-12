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
var cmd=require('node-cmd');
var questions = require('questions');
var xsession;
var bareboneversion;
var output = "downloadedfile.zip";
const targetip = '10.10.2.21';
//
//
// // the login json file
var login = {
	"username": "a@a.a", //still here for the purpose of easier testing (just comment out line 34-35 to have it hardcodded)
	"password": "aaa",
	":type": "urn:seluxit:xml:wappsto:session-1.2"
}

new Promise((resolve, reject) => {
    console.log('Let\'s login: ');
		questions.askMany({
    email: { info:'User email: ', required: true},
    password: { info:'User password: ', required: true},
}, function(result){
    console.log(result);
		login.username = result.email; //uncomment these lines for proper login
		login.password = result.password;
		resolve();
})

})
.then(() => {
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
	  return new Promise((resolve, reject) => {
	      console.log('Logged in, getting the file version...');
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
											console.log('Newest version: ' + response.body.version.slice(-1).pop()[':id']);
	                    resolve();
	                });
	          })
	        })
					.then(() => {
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
					              fs.createReadStream(output).pipe(unzip.Extract({ path: './unzipped/' }))
												resolve();
												console.log("Files extracted to /unzipped");
											});
					            });
					          });
					  })
					.then(()=>{
						console.log("Cleaning up and preparing environment...");
						setTimeout(function(){
							return new Promise((resolve, reject) => {
								fs.moveSync('unzipped/foreground', 'foreground', err => {
								if(err) console.log('Files already exist. Overwriting...');
							}, { overwrite: true })
								console.log('Files Moved!');

									fs.remove('unzipped', function(err){
										if(err) return console.error(err);
										console.log('temp folder deleted');
									})
									fs.remove(output, function(err){
										if(err) return console.error(err);
										console.log('zip file deleted');
									})

									console.log('preparing foreground folder - installing npm');
									cmd.run('npm install --prefix ./foreground');
									resolve();

								})
								.catch((err) => {
									fs.remove('unzipped', function(err){
										if(err) return console.error(err);
										console.log('temp folder deleted');
									})
									fs.remove(output, function(err){
										if(err) return console.error(err);
										console.log('zip file deleted');
									})

									console.log('preparing foreground folder - installing npm');
									cmd.run('npm install --prefix ./foreground');
								})

						}, 2000 );


						})
						.then(()=>{
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



						})


})




				.catch((err) => {
				  console.log(err);
				  console.log('Error came up.');
				})
