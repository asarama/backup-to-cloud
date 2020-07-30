'use strict';
const config = require('./config');
const nodemailer = require('nodemailer');
const schedule = require('node-schedule');
const fs = require('fs');
const { timeStamp } = require('console');

//This class is used to log information to a set of log files
class Logger {
    
    constructor(options) {
        
        this.fs = require('fs');
        this.fileDirectory = options.fileDirectory || (`${__dirname}/logs`);
        this.serviceName = options.serviceName || config.service.name;

        if (config.service.maintainer.email.enabled) {
            this.emailTransporter = nodemailer.createTransport(config.service.maintainer.email);
        }

        //Schedule delete old scripts function once everyday
        this.deleteOldLogsJob = schedule.scheduleJob({
            hour: 11,
            minute: 0
        }, () => {this.deleteOldLogs()});

        this.deleteIgnoreFiles = [".gitignore"];

    }
    
    //====\\
    //CORE\\
    //====\\
    
    /**
    * Logs a message to an error.log file
    * 
    * @param {string} message
    *   Message string to log
    *
    * @return {void}
    */
   
    error(message) {
        this.writeOut('error.log', message);
    }
    
    /**
    * Logs a message to an info.log file
    *
    * @param {string} message
    *   Message string to log
    *
    * @return {void}
    */

    info(message) {
        this.writeOut('info.log', message);
    }

    /**
    * Logs a message to a custom filename.
    *
    * @param {string} filename
    *   Name of the file to write to.
    * @param {string} message
    *   Message string to log.
    *
    * @return {void}
    */

    custom(filename, message) {
        this.writeOut(filename + '.log', message);
    }

    /**
    * Appends a message to a specified file in the file directory stated during initialization of this class
    *
    * Note:
    * Here we prepend a time stamp in the format HH:mm:ss to the message, and
    * a date stamp to the file name in the format YYYY-MM-DD-
    * We also convert the message to a string
    *
    * @param {String} fileName
    *   Name of file to write to.
    * @param {String} message
    *   Message string to log.
    *
    * @return {void}
    */

    writeOut(fileName, message) {

        const dateObject = this.formatDate(new Date());

		try {
			this.fs.appendFileSync(
				this.fileDirectory + "/" + fileName + "-" + dateObject.dateStamp, 
				dateObject.timeStamp + " " + this.messageToString(message) + "\r\n"
			);
		} catch (error) {
			throw error;
		}
    }

    /**
    * Send an email to our log email.
    *
    * @param {string} message
    *   Message string to email
    *
    * @return {void}
    */

    email(message) {

        if (!config.service.maintainer.email.enabled) {
            this.info(`Email message: ${message}`)
            this.info(`If you'd like to receive these messages via email update your config file.`)
            return
        }

        let mailOptions = {
            from: config.service.maintainer.email.auth.user,
            to: config.service.maintainer.email.auth.pass,
            subject: 'Message from Service: ' + this.serviceName,
            text: message,
            html: '<p>' + message + '</p>'
        };

        // send mail with defined transport object
        this.emailTransporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.error(error);
            }
        });

    }
    
    //=======\\
    //HELPERS\\
    //=======\\
    
    /**
    * Takes a standard date format and converts it to a date stamp (YYYY-MM-DD) and a time stamp (HH:mm:ss).
    *
    * @param {Date} date
    *   Date object to convert
    *
    * @return {Object}
    *  Object with two keys dateStamp, and timeStamp
    */
   
    formatDate(date) {
        
        //Pad a number to make it two digits
        function pad(number) {
            if (number < 10) {
              return '0' + number;
            };
            return number;
        };

        const dateStamp = date.getUTCFullYear() +
            '-' + pad(date.getUTCMonth() + 1) +
            '-' + pad(date.getUTCDate());

        const timeStamp = pad(date.getUTCHours()) +
            ':' + pad(date.getUTCMinutes()) +
            ':' + pad(date.getUTCSeconds());

        return {
            dateStamp: dateStamp,
            timeStamp: timeStamp
        };
    }
    
    /**
    * Converts any variable type to a string
    * 
    * @param {mixed} message
    *   Message to convert to string
    *
    * @return {string} converted message to string
    */ 
    
    messageToString(message) {
        
        switch (typeof message) {
            case "object":
                message = JSON.stringify(message, this.censor(message));
                break;
            case "array":
                message.map((item => this.messageToString(item)));
                break;
        }
        
        return message;
        
    }

    /**
    * Converts a circular object reference to a string
    *
    * @author: https://stackoverflow.com/questions/4816099/chrome-sendrequest-error-typeerror-converting-circular-structure-to-json
    *
    * @param {mixed} censor
    *   Object to check.
    *
    * @return {mixed} 
	*	converted circular object to string
    */

    censor(censor) {

        let i = 0;

        return (key, value) => {

            if(i !== 0 && typeof(censor) === 'object' && typeof(value) === 'object' && censor == value)
                return '[Circular]';

            if(i >= 29) // seems to be a hard maximum of 30 serialized objects?
                return '[Unknown]';

            ++i; // so we know we aren't using the original object anymore

            return value;

        };
    }

    /**
    * Find all log files that are older than 30 days and delete them
    *
    * @return {void}
    */

    deleteOldLogs() {

        //Create a new date for 30 days ago
        const deleteOlderThanDateStamp = new Date(new Date() - 1000 * 60 * 60 * 24 * 30);

        //Get all info.log and error.log files
        fs.readdir(this.fileDirectory, (error, files) => {

            if (error) {
                throw error;
            }

            files.forEach(fileName => {

                //ignore the .gitignore and other permanent log files defined in deleteIgnoreFiles
                if (!this.deleteIgnoreFiles.includes(fileName)) {
                    try {
                        const fileDateString = fileName.substring(fileName.length - 10, fileName.length);

                        //Make sure we have a string that can be turned into a valid date
                        if (!isNaN(Date.parse(fileDateString))) {

                            const fileDate = new Date(fileDateString);

                            //If file date is older delete it
                            if ((fileDate - deleteOlderThanDateStamp) < 0) {
                                fs.unlink(this.fileDirectory + "/" + fileName, error => {
                                    if (error) {
                                        throw error;
                                    }
                                });
                            }
                        }
                    } catch (e) {
						this.email(`Issue with deleting log file.`)
                    }
                }
            });
        });
    }
}

module.exports = Logger;