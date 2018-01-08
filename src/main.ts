import * as request from "request";
import * as fs from "fs";

import * as inquirer from "inquirer";

import { join, basename } from "path";

const APP_ID = 730;
const API_KEY = "1578879989BD74A6D189050250810E86";
const BIT_SHIFT: number = 61197960265728;
const PLAYER_SUMMARIES_API_URL = "http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002";

const resources = {
    import: "import",
    export: "export",
    sync: "sync"
}

interface IConfigObject {
    [key: string]: string;
}

enum applicationOptions {
    IMPORT = "IMPORT",
    IMPORTWEB = "IMPORTWEB",
    EXPORT = "EXPORT",
    SYNC = "SYNC"
}

/**
 * Utility function to convert 32bit steamids to 64bit
 * 
 * @param {any} id 
 * @returns 
 */
function convertTo64BitId(id: string): string {
    return `765${Number(id) + BIT_SHIFT}`;
}

// TODO: Add more search paths
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
            const url = `${PLAYER_SUMMARIES_API_URL}/?key=${API_KEY}&steamids=${ids.map(convertTo64BitId).join(",")}`;
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
    return fs.readdirSync(path).filter(name => configFiles.indexOf(name) !== -1).map(value => join(path, value));
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

function importConfig(web: boolean = false): void {
    inquirer.prompt([{
        type: "input",
        name: "url",
        message: "Please enter the url of your config"
    }]).then((answers) => {
        request(answers.url as string, (error, response, body) => {
            if (error) {
                throw new Error(error);
            }
            console.log(body);
        });
    });
}

/**
 * Export all configs to single json string
 * 
 */
function exportConfig(): void {

    const exportObject: IConfigObject = {};

    selectConfigDir("Which config would you like to export?").then(result => {
        const configPath = join(userDataPath, result, cfgRelativePath);
        const configFiles = getConfigFiles(configPath);

        configFiles.forEach(file => {
            const filename = basename(file);
            exportObject[filename] = fs.readFileSync(file, "utf8");
        });

        // Write serialized config file out
        fs.writeFileSync("out.json", JSON.stringify(exportObject));
    });
}

/**
 * Sync all configs from selected config
 * 
 */
function sync(): void {
    selectConfigDir("Which config would you like to sync from?").then(result => {
        confirm("Are you sure you want to sync?").then(confirmation => {
            const configPath = join(userDataPath, result, cfgRelativePath);
            const configFiles = getConfigFiles(configPath);

            const files: IConfigObject = {};

            // Grab all the config files from the source directory
            configFiles.forEach(file => {
                const filename = basename(file);
                files[filename] = fs.readFileSync(file, "utf8");
            });

            // Write this file to all other config directories
            if (confirmation) {
                getDirectories(userDataPath).forEach(value => {
                    const tempPath = join(userDataPath, value, cfgRelativePath);
                    for (const file in files) {
                        fs.writeFileSync(file, files[file]);
                    }
                });
            }
        })
    });
}

function confirm(message: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        inquirer.prompt({
            type: "confirm",
            name: "confirm",
            message
        }).then(answer => {
            resolve(answer.confirm);
        });
    });
}

function selectConfigDir(message: string): Promise<string> {
    return new Promise((resolve, reject) => {
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
                message,
                choices
            }]).then(answers => {
                const id = answers.source.split(" ")[0];
                resolve(id);
            });
        });
    });
}

function main(option: applicationOptions) {
    switch (option) {
        case applicationOptions.EXPORT:
            exportConfig();
            break;
        case applicationOptions.IMPORT:
            importConfig();
            break;
        case applicationOptions.IMPORTWEB:
            importConfig(true);
            break;
        case applicationOptions.SYNC:
            sync();
            break;
    }
}

const choices: inquirer.ChoiceType[] = [
    {
        name: "sync",
        value: applicationOptions.SYNC
    },
    {
        name: "import",
        value: applicationOptions.IMPORT
    },
    {
        name: "export",
        value: applicationOptions.EXPORT
    },
];


inquirer.prompt([{
    type: "list",
    name: "option",
    message: "Please select one",
    choices: choices
}]).then((answers) => {
    main(answers.option);
});

