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

	let directory_access_responses

	try {

		directory_access_responses = await Promise.all(check_directory_access_requests);

	} catch (er) {

		console.error(er);
		await logger.error(`ERROR - Check directory access - ${er}`);
		process.exit(1);

	}
		
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
	const archive_response = await archive_directories(directories_to_backup);

	console.log(`Archiving complete!`);
	console.log(archive_response);
}

/**
* 1) Takes a set of paths to directories and compresses them.
* 2) Combines all archives into one file.
* 3) Uploads to cloud service.
*
* @param {Array[String]} directories
* 	Absolute path to directories to archive.
*/

const archive_directories = async (directories) => {
	
	let 
		archive_requests = [],
		archive_files = [];

	directories.forEach(directory => {
		archive_requests.push(file_system.archive(directory))
	});

	const archive_responses = await Promise.all(archive_requests.map(helpers.reflect))

	archive_responses.forEach(archive_response => {
		if (archive_response.resolved) {
			archive_files.push(archive_response.value);
		}
	});

	// Combine all archives into one file
	// We should store all archives from a backup session into one directory

	// Take all archived files and store them in one directory

	// Create directory to store all archives
	const archive_directory_name = `${new Date().getTime()}`
	await fs.promises.mkdir(
		`${__dirname}/archives/${archive_directory_name}`,
		{ recursive: true }
	)

	// Move files into directory
	let copy_file_requests = [];
	archive_files.forEach(archive_file => {
		copy_file_requests.push(fs.promises.copyFile(
			`${__dirname}/archives/${archive_file}`,
			`${__dirname}/archives/${archive_directory_name}/${archive_file}`
		))
	});

	await Promise.all(copy_file_requests.map(helpers.reflect));

	const final_archive_file_name = `backup-${archive_directory_name}.tar.gz`;

	console.log("Archiving old files");
	// Now archive this directory
	await file_system.archive_raw(`${__dirname}/archives/${archive_directory_name}`, `${__dirname}/archives/${final_archive_file_name}`);

	// Remove sub step archive files
	let delete_file_requests = [];
	archive_files.forEach(archive_file => {
		delete_file_requests.push(fs.promises.unlink(
			`${__dirname}/archives/${archive_directory_name}/${archive_file}`
		))
		delete_file_requests.push(fs.promises.unlink(
			`${__dirname}/archives/${archive_file}`
		))
	});

	await Promise.all(delete_file_requests.map(helpers.reflect));

	// Remove sub step archive directory
	await fs.promises.rmdir(`${__dirname}/archives/${archive_directory_name}`)

	// Start upload
	console.log("Uploading to targets")
	// Iterate through targets and run upload commands
	// return google.upload_file(`${__dirname}/archives/${final_archive_file_name}`);

	let upload_file_requests = []
	config.backup.targets.forEach(target => {

		let provider_instance
		switch(target.provider) {
			case "google":
				provider_instance = new (require("./src/cloud/google"))(target)
				break
			default:
				throw new Error(`Could not find class for provider ${target.provider}`)
		}

		upload_file_requests.push(provider_instance.upload_file(`${__dirname}/archives/${final_archive_file_name}`))

	})

	const upload_file_responses = await Promise.all(upload_file_requests.map(helpers.reflect));
	upload_file_responses.forEach(upload_file_response => {
		if (upload_file_response.resolved === false) {
			console.log("Upload failed")
			console.log(upload_file_response.value)
		}
	})

	console.log("Uploads complete");

}

// Setup scheduled task
// TODO: Test scheduling works with async function
const 
	job = schedule.scheduleJob(config.backup.schedule, init);
	
// If debug mode is enabled run the handler as soon as the application initializes
if (config.debug) {
    init();
}