import * as request from "request";
import * as fs from "fs";

import * as inquirer from "inquirer";

import { join, basename } from "path";

// TODO: turn these into command line arguments
const APP_ID = 730;
const API_KEY = "1578879989BD74A6D189050250810E86";
const BIT_SHIFT: number = 61197960265728;
const PLAYER_SUMMARIES_API_URL = "http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002";
const OUT_FILE_NAME = "out.json";

const resources = {
    import: "Import from file",
    importweb: "Import from URL",
    export: "Export config",
    sync: "Syncronize configs"
}

interface IConfigObject {
    [key: string]: string;
}

enum EApplicationOptions {
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
    // Select config directory to export
    selectConfigDir("Which config would you like to export?").then(result => {
        const configPath = join(userDataPath, result, cfgRelativePath);
        const configFiles = getConfigFiles(configPath);

        const exportObject: IConfigObject = {};

        // Read in config files
        configFiles.forEach(file => {
            const filename = basename(file);
            exportObject[filename] = fs.readFileSync(file, "utf8");
        });

        // Write serialized config file out
        fs.writeFileSync("out.json", JSON.stringify(exportObject));

        console.log(`Config written to ${join(process.cwd, "out.json")}`);
    });
}

/**
 * Sync all configs from selected config
 * 
 */
function sync(): void {
    selectConfigDir("Which config would you like to sync from?").then(result => {
        confirm("Are you sure you want to sync?").then(() => {
            const configPath = join(userDataPath, result, cfgRelativePath);
            const configFiles = getConfigFiles(configPath);

            const configObject: IConfigObject = {};

            // Grab all the config files from the source directory
            configFiles.forEach(file => {
                const filename = basename(file);
                configObject[filename] = fs.readFileSync(file, "utf8");
            });

            // Write the config
            writeConfig(configObject);
        })
    });
}

function writeConfig(configObject: IConfigObject) {
    // Write this file to all config directories
    getDirectories(userDataPath).forEach(value => {
        for (const file in configObject) {
            fs.writeFileSync(join(userDataPath, value, cfgRelativePath, file), configObject[file]);
        }
    });
}

/**
 * Helper function to ask for confirmation
 * 
 * @param {string} message 
 * @returns {Promise<boolean>} 
 */
function confirm(message: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        inquirer.prompt({
            type: "confirm",
            name: "confirm",
            message
        }).then(answer => {
            if (answer) {
                resolve();
            }
            else {
                reject();
            }
        });
    });
}

/**
 * Helper function to ask user to select a config directory
 * 
 * @param {string} message 
 * @returns {Promise<string>} 
 */
function selectConfigDir(message: string): Promise<string> {
    return new Promise((resolve, reject) => {

        // Get all the config directories
        let configDirs = getDirectories(userDataPath);

        const files: any = {};
        const playerSummaries: any = {};

        // Get player summaries so we can show account name next to steamid
        getPlayerSummaries(configDirs).then(response => {
            response.forEach(summary => {
                playerSummaries[summary.steamid] = summary;
            });

            const choices: string[] = [];

            // If there is a player summary for this ID, add the account name to the choice
            configDirs.forEach(value => {
                if (playerSummaries[convertTo64BitId(value)]) {
                    choices.push(`${value} [${playerSummaries[convertTo64BitId(value)].personaname}]`);
                }
                else {
                    choices.push(value);
                }
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

function main(option: EApplicationOptions) {
    switch (option) {
        case EApplicationOptions.EXPORT:
            exportConfig();
            break;
        case EApplicationOptions.IMPORT:
            importConfig();
            break;
        case EApplicationOptions.IMPORTWEB:
            importConfig(true);
            break;
        case EApplicationOptions.SYNC:
            sync();
            break;
    }
}

const choices: inquirer.ChoiceType[] = [
    {
        name: resources.sync,
        value: EApplicationOptions.SYNC,
    },
    {
        name: resources.import,
        value: EApplicationOptions.IMPORT
    },
    {
        name: resources.importweb,
        value: EApplicationOptions.IMPORTWEB
    },
    new inquirer.Separator(),
    {
        name: resources.export,
        value: EApplicationOptions.EXPORT
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

