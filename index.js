var fs = require('fs');
var path = require('path')
require('date-utils');

var spawn = require('child_process').spawn;
var CWD = null;
var SVN_ROOT = 'http://svn.corp.qunar.com/svn/qzz.com/';

exports.usage = "提供svn的快捷指令";

var trim = function(str) { return str.replace(/^[\s]+|[\s]+$/, "") };

function check_project( prj ) {
    check_dir = path.resolve( CWD , prj );
    if( fs.existsSync(check_dir) ) {
        console.info("[ERROR] 当前目录下已经存在该目录，请确认是否覆盖。");
        return 0;
    }
    return 1;
}

function use( args , cb ) {
    if( typeof args == 'function' ) {
        cb = args;
        args = []
    }
    var svn = spawn('svn',args,{
        cwd : CWD
    });

    var err = ''
    svn.stderr.on('data',function(data){ err += data; });

    var output = ''
    svn.stdout.on('data',function(data){ output += data; });

    svn.on('error',function(err){
        if( err.code == 'ENOENT' ) {
            return cb('[ERROR] 找不到svn命令，请确认您是否正确安装了svn命令行工具。');
        }
    })

    svn.on('exit',function(code, signal){
        switch( code ) {
            case 1:
                cb('[ERROR] ' + err );
                break;
            case 127:
                cb('[ERROR] 找不到svn命令，请确认您是否正确安装了svn命令行工具。');
                break;
            default:
                cb(null,output);
                break;
        }
    });
}

function checkSvn( cb ) {

    use(['--version'],function(err,output){
        cb( err , output );
    });

}

function do_checkout( options ) {

    var prj = options.checkout;

    if( !prj ) return console.info("[ERROR] 请输入正确的项目名");

    if( !check_project(prj) ) return;

    use([ 'checkout' , SVN_ROOT + prj + '/trunk/' , prj ], function(err,output){
        console.info( output );
    })

}

function do_branch( options ) {

    var n = options.branch;
    var ns = (n||"").split(':');

    if( !n || ns.length != 2 ) return console.info("[ERROR] 请输入正确的项目名与分支名，格式如 flight:bugfix");

    var prj = trim( ns[0] );
    var brh = new Date().toFormat("YYYYMMDD") + '-' + trim( ns[1] );
    var trk_path = SVN_ROOT + prj + '/trunk/';
    var brh_path = SVN_ROOT + prj + '/branches/' + brh;

    if( !check_project(prj) ) return;

    use(['info', brh_path],function(err){
        if( !err ) { return console.info( "[ERROR] 已经存在 " + brh + " 这个分支了" ); }
        use(['cp',trk_path,brh_path,'-m','copy from '+prj], function(err){
            if( err ) {
                return console.info( err )
            } else {
                use(['checkout',brh_path,prj],function(err,output){
                    console.info( output );
                });
            }
        })
    });

}

exports.set_options = function( optimist ){

    optimist.alias('c','checkout')
    optimist.describe('c','检出指定项目的trunk，如 fekit svn -c flight')

    optimist.alias('b','branch')
    return optimist.describe('b','创建新的分支，如 fekit svn -b flight:bugfix')

}

exports.run = function( options ){

    CWD = options.cwd;

    checkSvn(function(err){

        if( err ) return console.info(err);

        if( options.branch ) return do_branch( options );

        if( options.checkout ) return do_checkout( options );

        console.info("[INFO] 没有指定的操作，请参考 help 中的信息");

    });

}


