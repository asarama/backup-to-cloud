'use strict';
const config = require('../config');
const nodemailer = require('nodemailer');
const schedule = require('node-schedule');
const fs = require('fs');

//This class is used to log information to a set of log files
class Logger {
    
    constructor(options) {

        if (typeof options === 'undefined') {
            options = {};
        }
        
        this.file_directory = options.file_directory || (`${__dirname}/logs`);
        this.service_name = options.service_name || config.service.name;

        if (config.service.maintainer.email.enabled) {
            this.email_transporter = nodemailer.createTransport(config.service.maintainer.email);
        }

        //Schedule delete old scripts function once everyday
        this.delete_old_logs_job = schedule.scheduleJob({
            hour: 11,
            minute: 0
        }, () => {this.delete_old_logs()});

        this.delete_ignore_files = [".gitignore"];

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
   
    async error(message) {
        await this.write_out('error.log', message);
    }
    
    /**
    * Logs a message to an info.log file
    *
    * @param {string} message
    *   Message string to log
    *
    * @return {void}
    */

    async info(message) {
        await this.write_out('info.log', message);
    }

    /**
    * Logs a message to a custom file_name.
    *
    * @param {string} file_name
    *   Name of the file to write to.
    * @param {string} message
    *   Message string to log.
    *
    * @return {void}
    */

    async custom(file_name, message) {
        await this.write_out(file_name + '.log', message);
    }

    /**
    * Appends a message to a specified file in the file directory stated during initialization of this class
    *
    * Note:
    * Here we prepend a time stamp in the format HH:mm:ss to the message, and
    * a date stamp to the file name in the format YYYY-MM-DD-
    * We also convert the message to a string
    *
    * @param {String} file_name
    *   Name of file to write to.
    * @param {String} message
    *   Message string to log.
    *
    * @return {void}
    */

    async write_out(file_name, message) {

        const 
            date_object = this.format_date(new Date()),
            log_file_path = this.file_directory + "/" + file_name + "-" + date_object.date_stamp;

		try {

            if (await this.file_exists(log_file_path) === false) {
                await fs.promises.writeFile(log_file_path, "");
            }

            await fs.promises.appendFile(
                log_file_path,
                date_object.time_stamp + " " + this.message_to_string(message) + "\r\n"
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

        let mail_options = {
            from: config.service.maintainer.email.auth.user,
            to: config.service.maintainer.email.auth.pass,
            subject: 'Message from Service: ' + this.service_name,
            text: message,
            html: '<p>' + message + '</p>'
        };

        // send mail with defined transport object
        this.email_transporter.sendMail(mail_options, (error, info) => {
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
    *  Object with two keys date_stamp, and time_stamp
    */
   
    format_date(date) {
        
        //Pad a number to make it two digits
        function pad(number) {
            if (number < 10) {
              return '0' + number;
            };
            return number;
        };

        const date_stamp = date.getUTCFullYear() +
            '-' + pad(date.getUTCMonth() + 1) +
            '-' + pad(date.getUTCDate());

        const time_stamp = pad(date.getUTCHours()) +
            ':' + pad(date.getUTCMinutes()) +
            ':' + pad(date.getUTCSeconds());

        return {
            date_stamp,
            time_stamp
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
    
    message_to_string(message) {
        
        switch (typeof message) {
            case "object":
                message = JSON.stringify(message, this.censor(message));
                break;
            case "array":
                message.map((item => this.message_to_string(item)));
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

    delete_old_logs() {

        //Create a new date for 30 days ago
        const delete_older_than_date_stamp = new Date(new Date() - 1000 * 60 * 60 * 24 * 30);

        //Get all info.log and error.log files
        fs.readdir(this.file_directory, (error, files) => {

            if (error) {
                throw error;
            }

            files.forEach(file_name => {

                //ignore the .gitignore and other permanent log files defined in delete_ignore_files
                if (!this.delete_ignore_files.includes(file_name)) {
                    try {
                        const file_date_string = file_name.substring(file_name.length - 10, file_name.length);

                        //Make sure we have a string that can be turned into a valid date
                        if (!isNaN(Date.parse(file_date_string))) {

                            const file_date = new Date(file_date_string);

                            //If file date is older delete it
                            if ((file_date - delete_older_than_date_stamp) < 0) {
                                fs.unlink(this.file_directory + "/" + file_name, error => {
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

    async file_exists(path_to_file) {
        try {
            const file_stats = await fs.promises.lstat(path_to_file);
            return true;
        } catch (e) {
            return false;
        }
    }


}

module.exports = Logger;