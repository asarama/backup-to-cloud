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
	* @param {String} path_to_directory
	* 	Absolute path to directory to evaluate.
	*
	* @return {Object} 
	*	Resolves with one important key files_we_can_not_access. This is an array of 
	*/

	check_directory_access(path_to_directory) {
		return new Promise((resolve, reject) => {
			
			// Get all entities in directory
			fs.promises.readdir(path_to_directory, {withFileTypes:true}).then(contents => {
				
				console.log('Testing directory:');
				console.log(path_to_directory);
				console.log(contents);
				
				// Create requests for each entity to test if it is a file or a directory 
				let check_if_directory_requests = [];
				contents.forEach(content => {
					check_if_directory_requests.push(this.check_if_directory(`${path_to_directory}${content.name}`));
				})
				
				return Promise.all(check_if_directory_requests);
				
			}).then(is_directory_responses => {
				
				let access_requests = [];
				
				// If the entity is a directory run check_directory_access to test nested directories
				is_directory_responses.forEach(file => {
					if (file.is_directory) {
						
						console.log(`Found nested directory:`);
						console.log(file.path);
						
						access_requests.push(this.check_directory_access(`${file.path}/`));
						
					} else {
						
						// If the entity is a file test read access
						access_requests.push(this.test_file_read_access(file.path));
						
					}
				});
				
				return Promise.all(access_requests.map(this.helpers.reflect));
				
			}).then(access_responses => {
				
				let files_we_can_not_access = [];
				
				access_responses.forEach(access_response => {
					if (!access_response.resolved) {
						console.log(`No access to:`);
						console.log(access_response.value.path);
						files_we_can_not_access.push(access_response.value.path);
						
					} else {
						
						// Concatenate any recursive calls
						if (access_response.value && access_response.value.files_we_can_not_access) {
							files_we_can_not_access = files_we_can_not_access.concat(access_response.value.files_we_can_not_access);
						}
					}
				});
				
				resolve({
					files_we_can_not_access
				});
				
			}).catch(reject);
		});
	}
	
	/**
	* Checks if an entity at a path is a directory or a file.
	*
	* @param {String} path
	* 	Absolute path to entity to evaluate.
	*
	* @return {Object} 
	*	Two keys returned path, and is_directory.
	*/

	check_if_directory(path) {
		return new Promise((resolve, reject) => {
			fs.promises.stat(path).then(fileStats => {
				resolve({
					path,
					is_directory: fileStats.isDirectory()
				})
			}).catch(reject);
		});
	}

	/**
	* Check if a file can be read.
	*
	* @param {String} path
	* 	Absolute path to file to evaluate.
	*
	* @return {Object} 
	*	Two keys returned path, and can_access.
	*/

	test_file_read_access(path) {
		return new Promise((resolve, reject) => {
			fs.promises.access(path, fs.constants.R_OK).then(() => {
				resolve({
					path,
					can_access: true
				})
			}).catch(() => {
				resolve({
					path,
					can_access: false
				})
			});
		});
	}

	/**
	* Convert a directory and it's nested files into a compressed file in the archives directory.
	*
	* @param {String} path
	* 	Absolute path to directory to archive.
	*
	* @return {String} 
	*	Name of directory archive.
	*/

	archive(path) {

		// TODO: repetitive, make into helper function
		const 
			path_hash = crypto.createHmac('sha256', path).update(path).digest('hex').substr(0, 12),
			last_directory_in_path = this.helpers.end_entity_in_path(path)

		let archive_file_name = `${new Date().getTime()}-${path_hash}`

		if (last_directory_in_path !== ".") {
			archive_file_name += `-${last_directory_in_path}`
		}

		archive_file_name += `.tar.gz`
			
		const write_out_path = `${__dirname}/../archives/${archive_file_name}`;

		return this.archive_raw(path, write_out_path);
	}

	archive_raw(read_path, out_path) {
		return new Promise((resolve, reject) => {

			const 
				archive_file_name = out_path.split("/")[out_path.split("/").length - 1],
				file_write_stream = fs.createWriteStream(out_path);

			tar.pack(read_path)
				.pipe(zlib.Gzip())
				.pipe(file_write_stream);

			file_write_stream.on('close', () => {
				resolve(archive_file_name);
			});

			file_write_stream.on('error', reject);

		});
	}

	// Depreciated for now
	// Moving onto stream solution
	get_all_files_and_directories(starting_path, current_directory_map) {
		return new Promise((resolve, reject) => {
			
			// Make sure starting path is a file
			// Else run readdir with a recursive call for each found file
			let directory_map = {};
			
			this.check_if_directory(starting_path).then(file_response => {
				
				// Add 
				directory_map[starting_path] = {
					is_directory: file_response.is_directory
				};
				
				let dynamic_request = null;
				
				if (!file_response.is_directory) {
					
					dynamic_request = this.helpers.empty_promise;
					
				} else {
					
					dynamic_request = fs.promises.readdir;
					
				}
				
				// might need apply syntax
				// return dynamic_request.apply(this, [starting_path, {withFileTypes:true}]);
				return dynamic_request(starting_path, {withFileTypes:true});
				
			}).then(dynamic_response => {
				
				let recursive_requests = [];
				
				if (dynamic_response) {
					dynamic_response.forEach(content => {
						recursive_requests.push(this.get_all_files_and_directories(`${starting_path}\\${content.name}`));
					})
				}
				
				return Promise.all(recursive_requests);
				
			}).then(responses => {
				
				responses.forEach(response => {
					
					directory_map[response.starting_path] = response.directory_map;
					
				});
				
				resolve({
					directory_map,
					starting_path
				});
				
			}).catch(reject);
		});
	}

}

module.exports = FileSystem;