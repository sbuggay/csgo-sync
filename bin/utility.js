"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const request = require("request");
const path_1 = require("path");
/**
 * Utility function to convert 32bit steamids to 64bit
 *
 * @param {any} id
 * @returns
 */
function convertTo64BitId(id) {
    return `765${Number(id) + 61197960265728}`;
}
exports.convertTo64BitId = convertTo64BitId;
// TODO: Add more search paths
/**
 * Utilty function to determine if path is a directory
 *
 * @param {any} path
 * @returns
 */
function isDirectory(path) {
    return fs.lstatSync(path).isDirectory();
}
exports.isDirectory = isDirectory;
/**
 * Gets all files that match the file mask
 *
 * @param {any} path
 * @returns
 */
function getMatchingFiles(path, mask) {
    return fs.readdirSync(path).filter(name => mask.indexOf(name) !== -1).map(value => path_1.join(path, value));
}
exports.getMatchingFiles = getMatchingFiles;
/**
 * Utility function to get directories of a given path
 *
 * @param {any} path
 * @returns
 */
function getDirectories(path) {
    return fs.readdirSync(path).filter(name => isDirectory(path_1.join(path, name)));
}
exports.getDirectories = getDirectories;
/**
 * Get player summaries using steam api
 *
 * @param {any} ids
 * @returns
 */
function getPlayerSummaries(url, apikey, ids) {
    return new Promise((resolve, reject) => {
        if (Array.isArray(ids) && ids.length > 0) {
            request(`${url}/?key=${apikey}&steamids=${ids.map(convertTo64BitId).join(",")}`, (error, response, body) => {
                if (error) {
                    throw new Error(error);
                }
                resolve(JSON.parse(body).response.players);
            });
        }
        else {
            resolve([]);
        }
    });
}
exports.getPlayerSummaries = getPlayerSummaries;
