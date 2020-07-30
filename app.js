// Identify folders that need to be backed up from our env file
// Create initial back up files using backup
// Combine back up files into one archive
// Upload to configured cloud service

const 
	fs = require('fs'),
	schedule = require('node-schedule'),
	config = require('./config'),
	logger = new (require(`./src/logger`))({}),
	helpers = new (require(`./src/helpers`))(),
	google = new (require(`./src/cloud/google`))(config),
	fileSystem = new (require(`./src/fileSystem`))(helpers);


/**
* Makes sure we have access to a set of directories defined in our config file
* then archives them. 
*/

function init() {

	const directoriesToBackup = config.backup.directories;

	console.log(`Will be backing up:`)
	console.log(directoriesToBackup);

	// Make sure we have read access to the directories we need to backup
	let checkDirectoryAccessRequests = [];
	directoriesToBackup.forEach(directory => {
		checkDirectoryAccessRequests.push(fileSystem.checkDirectoryAccess(directory))
	});

	Promise.all(checkDirectoryAccessRequests).then(directoryAccessResponses => {
		
		// Make sure we do not have any unaccessible files
		let filesWeCanNotAccess = [];
		directoryAccessResponses.forEach(directoryAccessResponse => {
			filesWeCanNotAccess = filesWeCanNotAccess.concat(directoryAccessResponse.filesWeCanNotAccess);
		});
		
		// If we find any files we can not access abort the operation
		if (filesWeCanNotAccess.length > 0) {
			console.log(`Can not start compression until read access is avaliable for:`);
			console.log(filesWeCanNotAccess);

			logger.error(`Some files were not accessable: ${filesWeCanNotAccess}`);
			process.exit(1);
		}
		
		// TO DO: Convert this process and rest of promise chain into a scheduled task
		return archiveDirectories(directoriesToBackup);

	}).then(archiveResponse => {

		console.log(`Archiving complete!`);
		console.log(archiveResponse);
		
	}).catch(error => {
		
		console.error(error);
		logger.error(`Undocumented error: ${error}`);
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

function archiveDirectories(directories) {
	return new Promise((resolve, reject) => {
		
		let 
			archiveRequests = [],
			archiveFiles = [],
			archiveDirectoryName,
			finalArchiveFilename;

		directories.forEach(directory => {
			archiveRequests.push(fileSystem.archive(directory))
		});

		Promise.all(archiveRequests.map(helpers.reflect)).then(archiveResponses => {

			archiveResponses.forEach(archiveResponse => {
				if (archiveResponse.resolved) {
					archiveFiles.push(archiveResponse.value);
				}
			});

			archiveDirectoryName = `${new Date().getTime()}`;

			// Combine all archives into one file
			// We should store all archives from a backup session into one directory

			// Take all archived files and store them in one directory
			return helpers.callBackToPromise(fs, fs.mkdir, [
				`${__dirname}/archives/${archiveDirectoryName}`, 
				{ recursive: true }
			]);

		}).then(() => {

			// Move files into directory
			let copyFileRequests = [];
			archiveFiles.forEach(archiveFile => {
				copyFileRequests.push(helpers.callBackToPromise(fs, fs.copyFile, [
					`${__dirname}/archives/${archiveFile}`,
					`${__dirname}/archives/${archiveDirectoryName}/${archiveFile}`
				]));
			});

			return Promise.all(copyFileRequests.map(helpers.reflect));

		}).then(() => {

			finalArchiveFilename = `backup-${archiveDirectoryName}.tar.gz`;

			console.log("Archiving old files");
			// Now archive this directory
			return fileSystem.archiveRaw(`${__dirname}/archives/${archiveDirectoryName}`, `${__dirname}/archives/${finalArchiveFilename}`);

		}).then(() => {

			// Remove substep archive files
			let deleteFileRequests = [];
			archiveFiles.forEach(archiveFile => {
				deleteFileRequests.push(helpers.callBackToPromise(fs, fs.unlink, [
					`${__dirname}/archives/${archiveDirectoryName}/${archiveFile}`
				]));
				deleteFileRequests.push(helpers.callBackToPromise(fs, fs.unlink, [
					`${__dirname}/archives/${archiveFile}`
				]));
			});

			return Promise.all(deleteFileRequests.map(helpers.reflect));

		}).then(() => {

			// Remove substep archive directory
			return helpers.callBackToPromise(fs, fs.rmdir, [
				`${__dirname}/archives/${archiveDirectoryName}`
			]);

		}).then(() => {

			// Then start upload
			return google.uploadFile(`${__dirname}/archives/${finalArchiveFilename}`);
			
			
		}).then(resolve).catch(reject);
	});
}

// Setup scheduled task
const 
	job = schedule.scheduleJob(config.backup.schedule, init);
	
// If debug mode is enabled run the handler as soon as the application initializes
if (config.debug) {
    init();
}