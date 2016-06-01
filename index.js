#!/usr/bin/env node

var overpass = require('query-overpass');
var fs = require('fs');
var argv = require('minimist')(process.argv.slice(2));
var upload = require('mapbox-upload');
var raju = require('raju');

if (!argv.query || !argv.MapboxAccessToken || !argv.mapid) {
    usage();
    process.exit(1);
}

var input = argv.query;
var accessToken = argv.MapboxAccessToken;
var mapid = argv.mapid;
var user = mapid.split('.')[0];
var id = mapid.split('.')[1];
var name = argv.name;
var overpassUrl = argv.overpassUrl;

var query = fs.readFileSync(__dirname + '/' + input, {encoding: 'utf-8'});
process.stdout.write('Querying overpass...' + '\n');
overpass(query, function(err, data) {
    if (err) throw err;
    process.stdout.write('Results:' + data.features.length + ' features\n');
    process.stdout.write('Cleaning up geojson...' + '\n');
    data.features.forEach(function(feature) {
        var props = feature.properties;
        var keys = Object.keys(props);
        keys.forEach(function(key) {
            if (props[key] instanceof Array) {
                props[key].forEach(function(prop) {
                    flatten(prop, key, props);
                });
            }

            if (props[key] instanceof Object) {
                flatten(props[key], key, props);
            }
        });
    });
    var geojson = JSON.stringify(raju(data));
    fs.writeFileSync('query.geojson', geojson);
    process.stdout.write('Uploading to Mapbox...' + '\n');
    uploadData(__dirname + '/query.geojson', accessToken, mapid, user);
}, overpassUrl);


function uploadData(file, accessToken, mapid, user) {
    var progress = upload({
        file: file,
        account: user,
        accesstoken: accessToken,
        mapid: mapid,
        name: name
    });

    progress.on('error', function(err){
        if (err) throw err;
    });

    progress.on('progress', function(p){
        process.stdout.write(String(Math.floor(p.percentage)) + '%\n') ;
    });

    progress.once('finished', function(){
        process.stdout.write('Done! \n');
    });
}

function flatten(obj, parentKey, properties) {
    var objectLength = obj.length;
    Object.keys(obj).forEach(function(key) {
        if (obj[key] instanceof Object) {
            flatten(obj[key], parentKey + '_' + key, properties);
            delete properties[parentKey];
        }
        properties[parentKey + '_' + key] = obj[key];
        delete properties[parentKey];
    });
}

function usage() {
    process.stdout.write('shaktiman --query path_to_overpass_query \n --MapboxAccessToken \n --mapid \n --name \n --overpassUrl');
}
