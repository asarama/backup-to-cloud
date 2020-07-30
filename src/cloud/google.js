// Imports the Google Cloud client library
const 
    {Storage} = require('@google-cloud/storage');

process.env.GOOGLE_APPLICATION_CREDENTIALS = `${__dirname}/google.json`;

class Google {

    constructor(config) {
        // Creates a client
        this.storage = new Storage();
        this.bucketName = config.google.bucket;
    }

    async uploadFile(filename) {

        // Uploads a file to a bucket
        return await this.storage.bucket(this.bucketName).upload(filename, {
            // Support for HTTP requests made with `Accept-Encoding: gzip`
            gzip: true,
            resumable: false,
            // By setting the option `destination`, you can change the name of the
            // object you are uploading to a bucket.
            metadata: {
                // Enable long-lived HTTP caching headers
                // Use only if the contents of the file will never change
                // (If the contents will change, use cacheControl: 'no-cache')
                cacheControl: 'public, max-age=31536000',
            }
        });

    }
}

module.exports = Google;