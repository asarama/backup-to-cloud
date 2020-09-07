'use strict';

class Helpers {
	
	constructor() {}
	
	/**
	* Used to create a promise that resolves right away.
	*
	* @return {Promise} 
	*	A promise that will always resolve.
	*/
	
	empty_promise() {
		return new Promise((resolve, reject) => {
			resolve();
		});
	}

	/**
	* Used to keep track of failed promises in concurrent calls without throwing errors.
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
	* Used to convert a callback function to a promise.
	*
	* @param {Object} this_ref
	* 	Parent class reference.
	* @param {Object} function_ref
	* 	Function to convert.
	* @param {Array[any]} parameters
	* 	Input parameters for function call.
	*
	* @return {Promise} 
	*	Returns a promise representation of the function reference.
	*/

	call_back_to_promise(this_ref, function_ref, parameters) {
		return new Promise((resolve, reject) => {
	
			// Add the callback handler
			parameters.push((error, result) => {
	
				if (error) {
					reject(error);
				}
	
				resolve(result);
			});
	
			function_ref.apply(this_ref, parameters);
		});
	}

	/**
	* Given a full absolute or relative path find the name of the file
	* or directory at the end.
	*
	* @param {String} full_path
	* 	Can be absolute or relative.
	*
	* @return {String} 
	*	The name of the file or directory at the end of the path.
	*/

	end_entity_in_path(full_path) {

		let path_to_strip = full_path;

		// Remove trailing / or \
		const last_char = path_to_strip[path_to_strip.length - 1];
		if (last_char === '/' || last_char === '\\') {
			path_to_strip = path_to_strip.slice(0, -1);
		}

		// Remove all prepended directories
		let split_forwards_bracket_path = path_to_strip.split('/');
		let split_backwards_bracket_path = split_forwards_bracket_path[split_forwards_bracket_path.length - 1].split('\\')		
		const end_entity = split_backwards_bracket_path[split_backwards_bracket_path.length - 1]

		return 	end_entity;

	}
	
}

module.exports = Helpers;