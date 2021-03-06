var Promise = require('es6-promise').Promise;
var semver = require('semver');
var fs = require('./fs');
var log = require('./log');

function possibleNewline(jsonSting) {
    return (jsonSting.slice(-1) === '\n') ? '\n' : '';
}

function space(json) {
    var match = json.match(/^(?:(\t+)|( +))"/m);
    return match ? (match[1] ? '\t' : match[2].length) : '';
}

function updateVersion(fileObj, opts){
    opts = opts || {};
    var type = opts.type || 'patch';
    var version = semver.valid(opts.version, opts.type) || null;
    var content, contentJSON;
    content = Buffer.isBuffer(fileObj.contents) ? fileObj.contents.toString('utf-8') : fileObj.contents ;

    try {
        contentJSON = JSON.parse(content);
    } catch (e) {
        return {err: 'Problem parsing JSON file'};
    }


    if (version) {
        contentJSON.version = version;
    } else if (semver.valid(contentJSON.version)) {
        contentJSON.version = semver.inc(contentJSON.version, type);
    } else {
        return {err: 'Detected invalid semver ' + contentJSON.version };
    }
    if (!contentJSON.version){
        return {err: 'Detected invalid semver type: must be patch, minor or major. Found ' + type };
    }
    fileObj.version  = version;
    fileObj.contents = new Buffer(JSON.stringify(contentJSON, null, void 0 || space(content)) + possibleNewline(content));
    return fileObj;
}

function updateJsonFile(fileObj, opts) {
    return new Promise(function(resolve, reject){
        fileObj = updateVersion(fileObj, opts);
        fileObj.err && reject(fileObj.err);
        !fileObj.err && resolve(fileObj);
    }).then(function(fileObj){
        return fs.write(fileObj);
    }).catch(log.onError);
}

function updateJson(fileObjs, opts){
    var promises = [];
    fileObjs.forEach(function(fileObj){
        promises.push(updateJsonFile(fileObj, opts));
    });
    return Promise.all(promises);
}

function bump(files, opts){
    return fs.read(files).then(function(fileObjs){
        return updateJson(fileObjs, opts);
    }).catch(log.onError);
}


module.exports = {
    _possibleNewline: possibleNewline,
    _updateVersion: updateVersion,
    bump: bump
};