const path = require('path');

module.exports = {
    entry: './src/neo4jE.js',
    devtool: "source-map",
    output: {
        filename: process.env.BUILD_WITH_DEPENDENCIES ? 'neo4jE.js' : 'neo4jE-without-dependencies.js',
        library: 'Neo4jE',
        libraryTarget: 'umd',
        path: path.resolve(__dirname, 'dist')
    },
    module: {
        rules: [{
            test: /\.js$/,
            exclude: /node_modules/,
            loader: 'babel-loader'
        }, {
            test: /\.css$/,
            use: ['style-loader', 'css-loader']
        }, {
            test: /\.(png|jpg|gif|svg|eot|ttf|woff2?)$/,
            loader: 'url-loader'
        }]
    },
    externals: [
        // externalize any library used
        (context, request, callback) => {
            if(!process.env.BUILD_WITH_DEPENDENCIES && !/^[\\.\/]/.test(request)) {
                return callback(null, {
                    commonjs: request,
                    commonjs2: request,
                    amd: request
                })
            }
            callback();
        }
    ]
};

