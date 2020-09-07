// Identify folders that need to be backed up from our env file
// Create initial back up files using backup
// Combine back up files into one archive
// Upload to configured cloud service

const 
	fs = require('fs'),
	schedule = require('node-schedule'),
	config = require('./config'),
	logger = new (require(`./src/logger`))({
		file_directory: `${__dirname}/logs`
	}),
	helpers = new (require(`./src/helpers`))(),
	// google = new (require(`./src/cloud/google`))(config),
	file_system = new (require(`./src/file_system`))(helpers);


/**
* Makes sure we have access to a set of directories defined in our config file
* then archives them. 
*/

const init = async () => {

	const directories_to_backup = config.backup.directories;

	console.log(`Will be backing up:`)
	console.log(directories_to_backup);

	// Make sure we have read access to the directories we need to backup
	let check_directory_access_requests = [];
	directories_to_backup.forEach(directory => {
		check_directory_access_requests.push(file_system.check_directory_access(directory))
	});

	Promise.all(check_directory_access_requests).then(async (directory_access_responses) => {
		
		// Make sure we do not have any unaccessible files
		let files_we_can_not_access = [];
		directory_access_responses.forEach(directory_access_response => {
			files_we_can_not_access = files_we_can_not_access.concat(directory_access_response.files_we_can_not_access);
		});
		
		// If we find any files we can not access abort the operation
		if (files_we_can_not_access.length > 0) {
			console.log(`Can not start compression until read access is available for:`);
			console.log(files_we_can_not_access);

			await logger.error(`Some files were not accessible: ${files_we_can_not_access}`);
			process.exit(1);
		}
		
		// TO DO: Convert this process and rest of promise chain into a scheduled task
		return archive_directories(directories_to_backup);

	}).then(async (archive_response) => {

		console.log(`Archiving complete!`);
		console.log(archive_response);
		
	}).catch(async (error) => {
		
		console.error(error);
		await logger.error(`Undocumented error: ${error}`);
		process.exit(1);
		
	})
}

/**
* 1) Takes a set of paths to directories and compresses them.
* 2) Combines all archives into one file.
* 3) Uploads to cloud service.
*
* @param {Array[String]} directories
* 	Absolute path to directories to archive.
*/

function archive_directories(directories) {
	return new Promise((resolve, reject) => {
		
		let 
			archive_requests = [],
			archive_files = [],
			archive_directory_name,
			final_archive_file_name;

		directories.forEach(directory => {
			archive_requests.push(file_system.archive(directory))
		});

		Promise.all(archive_requests.map(helpers.reflect)).then(archive_responses => {

			archive_responses.forEach(archive_response => {
				if (archive_response.resolved) {
					archive_files.push(archive_response.value);
				}
			});

			archive_directory_name = `${new Date().getTime()}`;

			// Combine all archives into one file
			// We should store all archives from a backup session into one directory

			// Take all archived files and store them in one directory
			return helpers.call_back_to_promise(fs, fs.mkdir, [
				`${__dirname}/archives/${archive_directory_name}`, 
				{ recursive: true }
			]);

		}).then(() => {

			// Move files into directory
			let copy_file_requests = [];
			archive_files.forEach(archive_file => {
				copy_file_requests.push(helpers.call_back_to_promise(fs, fs.copyFile, [
					`${__dirname}/archives/${archive_file}`,
					`${__dirname}/archives/${archive_directory_name}/${archive_file}`
				]));
			});

			return Promise.all(copy_file_requests.map(helpers.reflect));

		}).then(() => {

			final_archive_file_name = `backup-${archive_directory_name}.tar.gz`;

			console.log("Archiving old files");
			// Now archive this directory
			return file_system.archive_raw(`${__dirname}/archives/${archive_directory_name}`, `${__dirname}/archives/${final_archive_file_name}`);

		}).then(() => {

			// Remove substep archive files
			let delete_file_requests = [];
			archive_files.forEach(archive_file => {
				delete_file_requests.push(helpers.call_back_to_promise(fs, fs.unlink, [
					`${__dirname}/archives/${archive_directory_name}/${archive_file}`
				]));
				delete_file_requests.push(helpers.call_back_to_promise(fs, fs.unlink, [
					`${__dirname}/archives/${archive_file}`
				]));
			});

			return Promise.all(delete_file_requests.map(helpers.reflect));

		}).then(() => {

			// Remove substep archive directory
			return helpers.call_back_to_promise(fs, fs.rmdir, [
				`${__dirname}/archives/${archive_directory_name}`
			]);

		}).then(() => {

			// Start upload
			console.log("Uploading to targets");
			// Iterate through targets and run upload commands
			// return google.upload_file(`${__dirname}/archives/${final_archive_file_name}`);
			
			
		}).then(resolve).catch(reject);
	});
}

// Setup scheduled task
// TODO: Test scheduling works with async function
const 
	job = schedule.scheduleJob(config.backup.schedule, init);
	
// If debug mode is enabled run the handler as soon as the application initializes
if (config.debug) {
    init();
}