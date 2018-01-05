
import * as request from "request";
import * as fs from "fs";

import * as inquirer from "inquirer";

import { join } from "path";

const APP_ID = 730;
const API_KEY = "1578879989BD74A6D189050250810E86";
const BIT_SHIFT: number = 61197960265728;

/**
 * Utility function to convert 32bit steamids to 64bit
 * 
 * @param {any} id 
 * @returns 
 */
function convertTo64BitId(id: string): string {
    return `765${Number(id) + BIT_SHIFT}`;
}

const userDataPath = "C:/Program Files (x86)/Steam/userdata";
const cfgRelativePath = `${APP_ID}/local/cfg`;
const configFiles = [
    "config.cfg",
    "autoexec.cfg",
    "video.txt"
];

/**
 * Get player summaries using steam api
 * 
 * @param {any} ids 
 * @returns 
 */
function getPlayerSummaries(ids: string[]): Promise<any[]> {
    return new Promise((resolve, reject) => {
        if (ids && ids.length && ids.length > 0) {
            const url = `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${API_KEY}&steamids=${ids.map(convertTo64BitId).join(",")}`;
            return request(url, (error, response, body) => {
                if (error) {
                    throw new Error(error);
                }
                resolve(JSON.parse(body).response.players);
            });
        }
        else {
            throw new Error("ids must be an array");
        }
    });
}
/**
 * Utilty function to determine if path is a directory
 * 
 * @param {any} path 
 * @returns 
 */
function isDirectory(path: string): boolean {
    return fs.lstatSync(path).isDirectory();
}

/**
 * Gets all files that match the config file mask
 * 
 * @param {any} path 
 * @returns 
 */
function getConfigFiles(path: string): string[] {
    return fs.readdirSync(path).filter(name => configFiles.indexOf(name) !== -1);
}

/**
 * Utility function to get directories of a given path
 * 
 * @param {any} path 
 * @returns 
 */
function getDirectories(path: string): string[] {
    return fs.readdirSync(path).filter(name => isDirectory(join(userDataPath, name)));
}

function copyFile(source: string, destination: string): void {
    const readStream = fs.createReadStream(source);
    const writeStream = fs.createWriteStream(destination);
    if (readStream && writeStream) {
        readStream.pipe(writeStream);
    }
}

function main() {
    let configDirs = getDirectories(userDataPath);

    const files: any = {};
    const playerSummaries: any = {};

    getPlayerSummaries(configDirs).then(response => {
        response.forEach(summary => {
            playerSummaries[summary.steamid] = summary;
        });

        const choices: string[] = [];
        configDirs = configDirs.map(value => {
            files[value] = getConfigFiles(join(userDataPath, value, cfgRelativePath)).map(name => join(userDataPath, value, cfgRelativePath));
            if (playerSummaries[convertTo64BitId(value)]) {
                choices.push(`${value} [${playerSummaries[convertTo64BitId(value)].personaname}]`);
            }
            else {
                choices.push(value);
            }
            return join(userDataPath, value, cfgRelativePath);
        });
        inquirer.prompt([{
            type: "list",
            name: "source",
            message: "Which config would you like to copy",
            choices
        }]).then(answers => {

            const id = answers.source.split(" ")[0];

            configDirs.filter(name => name !== id).forEach(config => {
                console.log(files[config]);
            })
        });
    });
}

const choices: inquirer.ChoiceType[] = [
    {
        name: "copy",
        value: "copy"
    },
    {
        name: "copy",
        value: "copy"
    },
    {
        name: "copy",
        value: "copy"
    },
]

inquirer.prompt([{
    type: "list",
    name: "source",
    message: "Where are the source configs?",
    choices: choices
}]).then((answers) => {
    main();
});

