'use strict';
const 
	fs = require('fs'),
	tar = require('tar-fs'),
	zlib = require('zlib'),
	crypto = require('crypto');

class FileSystem {
	
	constructor(helpers) {
		this.helpers = helpers;
	}

	/**
	* Checks if all files and directories in directory are readable.
	*
	* @author: Arsham Eslami (arshameslami@gmail.com)
	* @copyright 2018 Third Hand
	*
	* @param {String} pathToDirectory
	* 	Absolute path to directory to evaluate.
	*
	* @return {Object} 
	*	Resolves with one important key filesWeCanNotAccess. This is an array of 
	*/

	checkDirectoryAccess(pathToDirectory) {
		return new Promise((resolve, reject) => {
			
			let fileAccessRequests = [];
			
			// Get all entities in directory
			fs.promises.readdir(pathToDirectory, {withFileTypes:true}).then(contents => {
				
				console.log('Testing directory:');
				console.log(pathToDirectory);
				console.log(contents);
				
				// Create requests for each entity to test if it is a file or a directory 
				let checkIfDirectoryRequests = [];
				contents.forEach(content => {
					checkIfDirectoryRequests.push(this.checkIfDirectory(`${pathToDirectory}\\${content.name}`));
				})
				
				return Promise.all(checkIfDirectoryRequests);
				
			}).then(isDirectoryResponses => {
				
				let accessRequests = [];
				
				// If the entity is a directory run checkDirectoryAccess
				isDirectoryResponses.forEach(file => {
					if (file.isDirectory) {
						
						console.log(`Found nested directory:`);
						console.log(`${file.path}\\`);
						
						accessRequests.push(this.checkDirectoryAccess(`${file.path}\\`));
						
					} else {
						
						// If the entity is a file test read access
						accessRequests.push(this.testFileReadAccess(file.path));
						
					}
				});
				
				return Promise.all(accessRequests.map(this.helpers.reflect));
				
			}).then(accessResponses => {
				
				let filesWeCanNotAccess = [];
				
				accessResponses.forEach(accessResponse => {
					if (!accessResponse.resolved) {
						console.log(`No access to:`);
						console.log(accessResponse.value.path);
						filesWeCanNotAccess.push(accessResponse.value.path);
						
					} else {
						
						// Concatenate any recursive calls
						if (accessResponse.value && accessResponse.value.filesWeCanNotAccess) {
							filesWeCanNotAccess = filesWeCanNotAccess.concat(accessResponse.value.filesWeCanNotAccess);
						}
					}
				});
				
				resolve({
					filesWeCanNotAccess
				});
				
			}).catch(reject);
		});
	}
	
	/**
	* Checks if an entity at a path is a directory or a file.
	*
	* @author: Arsham Eslami (arshameslami@gmail.com)
	* @copyright 2018 Third Hand
	*
	* @param {String} path
	* 	Absolute path to entity to evaluate.
	*
	* @return {Object} 
	*	Two keys returned path, and isDirectory.
	*/

	checkIfDirectory(path) {
		return new Promise((resolve, reject) => {
			fs.promises.stat(path).then(fileStats => {
				resolve({
					path,
					isDirectory: fileStats.isDirectory()
				})
			}).catch(reject);
		});
	}

	/**
	* Check if a file can be read.
	*
	* @author: Arsham Eslami (arshameslami@gmail.com)
	* @copyright 2018 Third Hand
	*
	* @param {String} path
	* 	Absolute path to file to evaluate.
	*
	* @return {Object} 
	*	Two keys returned path, and canAccess.
	*/

	testFileReadAccess(path) {
		return new Promise((resolve, reject) => {
			fs.promises.access(path, fs.constants.R_OK).then(() => {
				resolve({
					path,
					canAccess: true
				})
			}).catch(() => {
				resolve({
					path,
					canAccess: false
				})
			});
		});
	}

	/**
	* Convert a directory and it's nested files into a compressed file in the archives directory.
	*
	* @author: Arsham Eslami (arshameslami@gmail.com)
	* @copyright 2018 Third Hand
	*
	* @param {String} path
	* 	Absolute path to directory to archive.
	*
	* @return {String} 
	*	Name of directory archive.
	*/

	archive(path) {

		const 
			pathHash = crypto.createHmac('sha256', path).update(path).digest('hex').substr(0, 12),
			lastDirectoryInPath = this.helpers.endEntityInPath(path),
			archiveFileName = `${new Date().getTime()}-${pathHash}-${lastDirectoryInPath}.tar.gz`,
			writeOutPath = `${__dirname}/archives/${archiveFileName}`;

		return this.archiveRaw(path, writeOutPath);
	}

	archiveRaw(readPath, outPath) {
		return new Promise((resolve, reject) => {

			const 
				pathHash = crypto.createHmac('sha256', readPath).update(readPath).digest('hex').substr(0, 12),
				lastDirectoryInPath = this.helpers.endEntityInPath(readPath),
				archiveFileName = `${new Date().getTime()}-${pathHash}-${lastDirectoryInPath}.tar.gz`,
				fileWriteStream = fs.createWriteStream(outPath);

			tar.pack(`./${readPath}`)
				.pipe(zlib.Gzip())
				.pipe(fileWriteStream);

			fileWriteStream.on('close', () => {
				resolve(archiveFileName);
			});

			fileWriteStream.on('error', reject);

		});
	}

	// Depreciated for now
	// Moving onto fstream solution
	getAllFilesAndDirectories(startingPath, currentDirectoryMap) {
		return new Promise((resolve, reject) => {
			
			// Make sure starting path is a file
			// Else run readdir with a recursive call for each found file
			let directoryMap = {};
			
			this.checkIfDirectory(startingPath).then(fileResponse => {
				
				// Add 
				directoryMap[startingPath] = {
					isDirectory: fileResponse.isDirectory
				};
				
				let dynamicRequest = null;
				
				if (!fileResponse.isDirectory) {
					
					dynamicRequest = this.helpers.emptyPromise;
					
				} else {
					
					dynamicRequest = fs.promises.readdir;
					
				}
				
				// might need apply syntax
				// return dynamicRequest.apply(this, [startingPath, {withFileTypes:true}]);
				return dynamicRequest(startingPath, {withFileTypes:true});
				
			}).then(dynamicResponse => {
				
				let recursiveRequests = [];
				
				if (dynamicResponse) {
					dynamicResponse.forEach(content => {
						recursiveRequests.push(this.getAllFilesAndDirectories(`${startingPath}\\${content.name}`));
					})
				}
				
				return Promise.all(recursiveRequests);
				
			}).then(responses => {
				
				responses.forEach(response => {
					
					directoryMap[response.startingPath] = response.directoryMap;
					
				});
				
				resolve({
					directoryMap,
					startingPath
				});
				
			}).catch(reject);
		});
	}

}

module.exports = FileSystem;