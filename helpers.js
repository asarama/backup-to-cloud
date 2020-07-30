'use strict';

class Helpers {
	
	constructor() {}
	
	/**
	* Used to create a promise that resolves right away.
	*
	* @author: Arsham Eslami (arshameslami@gmail.com)
	* @copyright 2018 Third Hand
	*
	* @return {Promise} 
	*	A promise that will always resolve.
	*/
	
	emptyPromise() {
		return new Promise((resolve, reject) => {
			resolve();
		});
	}

	/**
	* Used to keep track of failed promises in concurrent calls without throwing errors.
	*
	* @author: Arsham Eslami (arshameslami@gmail.com)
	* @copyright 2018 Third Hand
	*
	* @param {Promise} promise
	* 	Request promise to track.
	*
	* @return {Promise} 
	*	Promises will now always "resolve" regardless of what happens in the nested promise.
	*/

	reflect(promise) {
		// Promises that fail will resolve with a resolved value of false and with the error instance in the value key.
		return promise.then(
			  v => {
					return {value: v, resolved: true};
			  },
			  e => {
					return {value: e, resolved: false};
			  }
		);
	};

	/**
	* Used to convert a callback funtion to a promise.
	*
	* @author: Arsham Eslami (arshameslami@gmail.com)
	* @copyright 2019 Third Hand
	*
	* @param {Object} thisRef
	* 	Parent class refence.
	* @param {Object} functionRef
	* 	Function to convert.
	* @param {Array[any]} parameters
	* 	Input parameters for function call.
	*
	* @return {Promise} 
	*	Returns a promise representation of the fuction reference.
	*/

	callBackToPromise(thisRef, functionRef, parameters) {
		return new Promise((resolve, reject) => {
	
			// Add the callback handler
			parameters.push((error, result) => {
	
				if (error) {
					reject(error);
				}
	
				resolve(result);
			});
	
			functionRef.apply(thisRef, parameters);
		});
	}

	/**
	* Given a full absolute or relative path find the name of the file
	* or directory at the end.
	*
	* @author: Arsham Eslami (arshameslami@gmail.com)
	* @copyright 2019 Third Hand
	*
	* @param {String} fullPath
	* 	Can be absolute or relative.
	*
	* @return {String} 
	*	The name of the file or directory at the end of the path.
	*/

	endEntityInPath(fullPath) {

		let pathToStrip = fullPath;

		// Remove trailing / or \
		const lastChar = pathToStrip[pathToStrip.length - 1];
		if (lastChar === '/' || lastChar === '\\') {
			pathToStrip = pathToStrip.slice(0, -1);
		}

		// Remove all prepended directories
		let splitForwardsBracketPath = pathToStrip.split('/');
		let splitBackwardsBracketPath = splitForwardsBracketPath[splitForwardsBracketPath.length - 1].split('\\')		
		const endEntity = splitBackwardsBracketPath[splitBackwardsBracketPath.length - 1]

		return 	endEntity;

	}
	
}

module.exports = Helpers;