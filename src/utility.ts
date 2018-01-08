import * as fs from "fs";
import * as request from "request";

import { join } from "path";

/**
 * Utility function to convert 32bit steamids to 64bit
 * 
 * @param {any} id 
 * @returns 
 */
export function convertTo64BitId(id: string): string {
    return `765${Number(id) + 61197960265728}`;
}

// TODO: Add more search paths


/**
 * Utilty function to determine if path is a directory
 * 
 * @param {any} path 
 * @returns 
 */
export function isDirectory(path: string): boolean {
    return fs.lstatSync(path).isDirectory();
}

/**
 * Gets all files that match the file mask
 * 
 * @param {any} path 
 * @returns 
 */
export function getMatchingFiles(path: string, mask: string[]): string[] {
    return fs.readdirSync(path).filter(name => mask.indexOf(name) !== -1).map(value => join(path, value));
}

/**
 * Utility function to get directories of a given path
 * 
 * @param {any} path 
 * @returns 
 */
export function getDirectories(path: string): string[] {
    return fs.readdirSync(path).filter(name => isDirectory(join(path, name)));
}

/**
 * Get player summaries using steam api
 * 
 * @param {any} ids 
 * @returns 
 */
export function getPlayerSummaries(url: string, apikey: string, ids: string[]): Promise<any> {
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
    })
}
