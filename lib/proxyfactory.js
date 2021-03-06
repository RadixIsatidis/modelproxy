/** 
 * ProxyFactory, Proxy
 * This class is provided to create proxy objects following the configuration
 * @author ShanFan
 * @created 24-3-2014
 */

// Dependencies
var fs = require( 'fs' );
var Constant = require( './constant' );

// logger
var logger = console;

// Instance of InterfaceManager, will be intialized when the proxy.use() is called.
var InterfaceManager = require( './interfacemanager' );

var ProxyClassSet = {};

var ProxyFactory = {

    // {Object} An object map to store created proxies. The key is interface id
    // and the value is the proxy instance. 
    proxies: {},

    init: function( path, variables ) {
        // load proxy plugins.
        var dir = fs.readdirSync( __dirname + '/plugins' );
        console.log( dir );
        for ( var i in dir ) {
            if ( !/^\w+\.js$/.test( dir[i] ) ) continue;
            var type = dir[i].split( '.' )[0];
            try {
                ProxyClassSet[ type ] = require( './plugins/' + type );
                logger.info( 'Proxy ' + type + ' is loaded.' );
            } catch ( e ) {
                logger.error( 'Failed to load proxy plugin '
                    + dir[i] + ', Caused by:\n' + e );
            }
        }
        // init InterfaceManager
        InterfaceManager.init( path, variables, ProxyClassSet );

        // init proxy classes
        var config = InterfaceManager.getConfig();
        for ( var type in ProxyClassSet ) {
            var ProxyClass = ProxyClassSet[ type ];
            if ( typeof ProxyClass.init === 'function' ) {
                try {
                    ProxyClass.init( config );
                } catch ( e ) {
                    logger.error( 'Failed to initialize proxy class ' + type + '.\nCaused by:\n' + e );
                }
            }
        }

        return this;
    },

    // Proxy factory
    // @throws errors
    create: function( interfaceId ) {
        if ( this.proxies[ interfaceId ] ) {
            return this.proxies[ interfaceId ];
        }
        var options = InterfaceManager.getProfile( interfaceId );
        if ( !options ) {
            throw new Error( 'Invalid interface id: ' + interfaceId );
        }
        var ProxyClass = ProxyClassSet[ options.type ];
        if ( typeof ProxyClass !== 'function' ) {
            throw new Error( 'Invalid proxy type of ' + options.type + ' for interface ' + interfaceId );
        }
        return this.proxies[ interfaceId ] = new ProxyClass( options );
    },

    // setLogger
    setLogger: function( l ) {
        logger = l;
        InterfaceManager.setLogger( l );
    },
    // getInterfaceIdsByPrefix
    getInterfaceIdsByPrefix: function( pattern ) {
        return InterfaceManager.getInterfaceIdsByPrefix( pattern );
    },
    // interceptRequest
    interceptRequest: function( req, res ) {
        var interfaceId = req.url.split( /\?|\// )[ 1 ];
        if ( interfaceId === '$interfaces' ) {
            var interfaces = InterfaceManager.getClientInterfaces();
            res.end( this.clientInterfaces 
                ? this.clientInterfaces 
                : this.clientInterfaces = JSON.stringify( interfaces ) );

            return;
        }

        try {
            proxy = this.create( interfaceId );
            if ( proxy.getOption( 'intercepted' ) === false ) {
                throw new Error( 'This url is not intercepted by proxy.' );
            }
        } catch ( e ) {
            res.statusCode = 404;
            res.end( 'Invalid url: ' + req.url + '\n' + e );
            return;
        }
        
        var status = proxy.getOption( 'status' );
        if ( status === Constant.STATUS_MOCK
                || status === Constant.STATUS_MOCK_ERR ) {
            proxy.requestMock( {}, function( data ) {
                console.log( proxy._opt.dataType );
                res.end( typeof data  === 'string' ? data : JSON.stringify( data ) );
            }, function( e ) {
                console.log( e );
                res.statusCode = 500;
                res.end( 'Error occurred when mocking data.' );
            } );
            return;
        }

        proxy.interceptRequest( req, res );
    }
}

module.exports = ProxyFactory;
