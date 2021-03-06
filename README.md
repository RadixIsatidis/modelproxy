# Midway-ModelProxy 轻量级的接口配置建模框架
===

## 目录
 - [Why?]()
   - [工作原理图]() 
 - [使用前必读]()
 - [快速开始]()
   - [用例一 接口文件配置->引入接口配置文件->创建并使用model]()
   - [用例二 model多接口配置及合并请求]()
   - [用例三 Model混合配置及依赖调用]()
   - [用例四 配置mock代理]()
   - [用例五 使用ModelProxy拦截请求]()
   - [用例六 在浏览器端使用ModelProxy]()
   - [用例七 代理带cookie的请求并且回写cookie]()
   - [用例八 使用ModelProxy代理HSF的consumer功能]()
 - [完整实例](demo/)
 - [配置文件详解]()
   - [interface.json 配置]()
   - [http interface 配置]()
   - [hsf interface 配置]()
   - [配置文件中的全局变量引入]()
 - [API]()
   - [ModelProxy对象创建方式]()
   - [创建ModelProxy对象时指定的profile相关形式]()
   - [ModelProxy logger设置]()
   - [ModelProxy对象方法]()
 - [如何使用ModelProxy的Mock功能]()
   - [rule.json文件]()
   - [rule.json文件样式]()
 - [附一 测试覆盖率]()
 - [附二 前后端分离思考与实践]()
 - [附三 中途岛整体架构图及modelproxy所处位置]()

## Why?
---
淘系的技术大背景下，必须依赖Java提供稳定的后端接口服务。在这样环境下，Node Server在实际应用中的一个主要作用即是代理(Proxy)功能。由于淘宝业务复杂，后端接口方式多种多样(MTop, Modulet, HSF...)。然而在使用Node开发web应用时，我们希望有一种统一方式访问这些代理资源的基础框架，为开发者屏蔽接口访问差异，同时提供友好简洁的数据接口使用方式。于是就有了 midway-modelproxy 这个构件。使用midway-modelproxy，可以提供如下好处：

1. 不同的开发者对于接口访问代码编写方式统一，含义清晰，降低维护难度。
2. 框架内部采用工厂+单例模式，实现接口一次配置多次复用。并且开发者可以随意定制组装自己的业务Model(依赖注入)。
3. 可以非常方便地实现线上，日常，预发环境的切换。
4. 内置[river-mock](http://gitlab.alibaba-inc.com/river/mock/tree/master)和[mockjs](http://mockjs.com)等mock引擎，提供mock数据非常方便。
5. 使用接口配置文件，对接口的依赖描述做统一的管理，避免散落在各个代码之中。
6. 支持浏览器端共享Model，浏览器端可以使用它做前端数据渲染。整个代理过程对浏览器透明。
7. 接口配置文件本身是结构化的描述文档，可以使用[river](http://gitlab.alibaba-inc.com/river/spec/tree/master)工具集合，自动生成文档。也可使用它做相关自动化接口测试，使整个开发过程形成一个闭环。

### ModelProxy工作原理图及相关开发过程图览
---
![](http://gtms03.alicdn.com/tps/i3/T1kp4XFNNXXXXaE5nO-688-514.png)

## 使用前必读
---
使用ModelProxy之前，您需要在工程根目录下创建名为interface.json的配置文件。该文件定义了工程项目中所有需要使用到的接口集合(详细配置说明见后文)。定义之后，您可以在代码中按照需要引入不同的接口，创建与业务相关的Model对象。接口的定义和model其实是多对多的关系。也即一个接口可以被多个model使用，一个model可以使用多个接口。具体情况由创建model的方式来决定。下面用例中会从易到难交您如何创建这些model。

## 快速开始
---

### 用例一 接口文件配置->引入接口配置文件->创建并使用model
* 第一步 配置接口文件命名为：interface_sample.json，并将其放在工程根目录下。
注意：整个项目有且只有一个接口配置文件，其interfaces字段下定义了多个接口。在本例中，仅仅配置了一个主搜接口。

```json
{
    "title": "pad淘宝项目数据接口集合定义",
    "version": "1.0.0",
    "engine": "mockjs",
    "rulebase": "interfaceRules",
    "status": "prod",
    "interfaces": [ {
        "name": "主搜索接口",
        "id": "Search.getItems",
        "urls": {
            "prod": "http://s.m.taobao.com/client/search.do"
        }
    } ]
}
```

* 第二步 在代码中引入ModelProxy模块，并且初始化引入接口配置文件（在实际项目中，引入初始化文件动作应伴随工程项目启动时完成，有且只有一次）

```js
// 引入模块
var ModelProxy = require( 'modelproxy' ); 

// interface配置文件的绝对路径
var path = require('path').resolve( __dirname, './interface_sample.json' );

// 初始化引入接口配置文件  （注意：初始化工作有且只有一次）
ModelProxy.init( path );
```

* 第三步 使用ModelProxy

```js
// 创建model
var searchModel = new ModelProxy( {
    searchItems: 'Search.getItems'  // 自定义方法名: 配置文件中的定义的接口ID
} );
// 或者这样创建: var searchModel = new ModelProxy( 'Search.getItems' ); 此时getItems 会作为方法名

// 使用model, 注意: 调用方法所需要的参数即为实际接口所需要的参数。
searchModel.searchItems( { keyword: 'iphone6' } )
    // !注意 必须调用 done 方法指定回调函数，来取得上面异步调用searchItems获得的数据!
    .done( function( data ) {
        console.log( data );
    } )
    .error( function( err ) {
        console.log( err );
    } );
```

### 用例二 model多接口配置及合并请求
* 配置

```json
{   // 头部配置省略...
    "interfaces": [ {
        "name": "主搜索搜索接口",
        "id": "Search.list",
        "urls": {
            "prod": "http://s.m.taobao.com/search.do"
        }
    }, {
        "name": "热词推荐接口",
        "id": "Search.suggest",
        "urls": {
            "prod": "http://suggest.taobao.com/sug"
        }
    }, {
        "name": "导航获取接口",
        "id": "Search.getNav",
        "urls": {
            "prod": "http://s.m.taobao.com/client/search.do"
        }
    } ]
}
```

* 代码

```js
// 更多创建方式，请参考后文API
var model = new ModelProxy( 'Search.*' );

// 调用自动生成的不同方法
model.list( { keyword: 'iphone6' } )
    .done( function( data ) {
        console.log( data );
    } );

model.suggest( { q: '女' } )
    .done( function( data ) {
        console.log( data );
    } )
    .error( function( err ) {
        console.log( err );
    } );

// 合并请求
model.suggest( { q: '女' } )
    .list( { keyword: 'iphone6' } )
    .getNav( { key: '流行服装' } )
    .done( function( data1, data2, data3 ) {
        // 参数顺序与方法调用顺序一致
        console.log( data1, data2, data3 );
    } );
```

### 用例三 Model混合配置及依赖调用

* 配置

```json
{   // 头部配置省略...
    "interfaces": [ {
        "name": "用户信息查询接口",
        "id": "Session.getUser",
        "type": "http",
        "urls": {
            "prod": "http://taobao.com/getUser.do"
        }
    }, {
        "name": "订单获取接口",
        "id": "Order.getOrder",
        "type": "http",
        "urls": {
            "prod": "http://taobao.com/getOrder"
        }
    } ]
}
```

* 代码

``` js
var model = new ModelProxy( {
    getUser: 'Session.getUser',
    getMyOrderList: 'Order.getOrder'
} );
// 先获得用户id，然后再根据id号获得订单列表
model.getUser( { sid: 'fdkaldjfgsakls0322yf8' } )
    .done( function( data ) {
        var uid = data.uid;
        this.getMyOrderList( { id: uid } )
            .done( function( data ) {
                console.log( data );
            } );
    } );
```

### 用例四 配置mock代理
* 第一步 在相关接口配置段落中启用mock

```json
{
    "title": "pad淘宝数据接口定义",
    "version": "1.0.0",
    "engine": "river-mock",                       <-- 指定mock引擎
    "rulebase": "interfaceRules",   <-- 指定存放相关mock规则文件的目录名，约定位置与interface.json文件存放在同一目录，默认为 interfaceRules
    "status": "prod",
    "interfaces": [ {
        "name": "主搜索接口",
        "id": "Search.getItems",
        "ruleFile": "Search.getItems.rule.json",  <-- 指定数据mock规则文件名，如果不配置，则将默认设置为 id + '.rule.json'
        "urls": {
            "prod": "http://s.m.taobao.com/client/search.do",
            "prep": "http://s.m.taobao.com/client/search.do",
            "daily": "http://daily.taobao.net/client/search.do"
        },
        "status": "mock"                            <-- 启用mock状态，覆盖全局status
    } ]
}
```

* 第二步 添加接口对应的规则文件到ruleBase(interfaceRules)指定的文件夹。mock数据规则请参考[river-mock](http://gitlab.alibaba-inc.com/river/mock/tree/master)和[mockjs](http://mockjs.com)。启动程序后，ModelProxy即返回相关mock数据。

### 用例五 使用ModelProxy拦截请求

```js
var app = require( 'connect' )();
var ModelProxy = require( 'modelproxy' );
var path = require('path').resolve( __dirname, './interface_sample.json' );
ModelProxy.init( path );

// 指定需要拦截的路径
app.use( '/model', ModelProxy.Interceptor );

// 此时可直接通过浏览器访问 /model/[interfaceid] 调用相关接口(如果该接口定义中配置了 intercepted = false, 则无法访问)
```

### 用例六 在浏览器端使用ModelProxy
* 第一步 按照用例二配置接口文件

* 第二步 按照用例五 启用拦截功能

* 第三步 在浏览器端使用ModelProxy

```html
<!-- 引入modelproxy模块，为方便起见直接引入，而非采用KISSY标准包配置引入。但该模块本身是由KISSY封装的标准模块-->
<script src="modelproxy-client.js" ></script>
```

```html
<script type="text/javascript">
    KISSY.use( "modelproxy", function( S, ModelProxy ) {
        // !配置基础路径，该路径与第二步中配置的拦截路径一致!
        // 且全局配置有且只有一次！
        ModelProxy.configBase( '/model/' );

        // 创建model
        var searchModel = ModelProxy.create( 'Search.*' );
        searchModel
            .list( { q: 'ihpone6' } )
            .list( { q: '冲锋衣' } )
            .suggest( { q: 'i' } )
            .getNav( { q: '滑板' } )
            .done( function( data1, data2, data3, data4 ) {
                console.log( {
                    "list_ihpone6": data1,
                    "list_冲锋衣": data2,
                    "suggest_i": data3,
                    "getNav_滑板": data4
                } );
            } );
    } );
</script>
```

### 用例七 代理带cookie的请求并且回写cookie (注：请求是否需要带cookie或者回写取决于接口提供者)

* 关键代码(app 由express创建)

```js
app.get( '/getMycart', function( req, res ) {
    var cookie = req.headers.cookie;
    var cart = ModelProxy.create( 'Cart.*' );
    cart.getMyCart()
        // 在调用done之前带上cookie
        .withCookie( cookie )
        // done 回调函数中最后一个参数总是需要回写的cookie，不需要回写时可以忽略
        .done( function( data , setCookies ) {
            // 回写cookie
            res.setHeader( 'Set-Cookie', setCookies );
            res.send( data );
        }, function( err ) {
            res.send( 500, err );
        } );
} );
```

### 用例八 使用ModelProxy代理HSF的consumenr功能

* 第一步，在interface.json文件中配置hsf interface

``` js
{
    "title": "pad淘宝项目数据接口集合定义",
    "version": "1.0.0",                      
    "engine": "river-mock",                  
    "status": "prod",                        
    "hsf": {                              
        "configServers": {
            "prod": "commonconfig.config-host.taobao.com",
            "daily": "10.232.16.8",          
            "prep": "172.23.226.84"
        }
    },
    interfaces:[ {
        "type": "hsf",
        "id": "UserService.append",
        "service": "com.taobao.uic.common.service.userdata.UicDataService",
        "methodName": "insertData"
    } ]
}
```

* 第二步，使用ModelProxy

```js

var UserService = ModelProxy.create( 'UserService.*' );

var user = [];
user.push( require( 'js-to-java' ).Long(456) );
user.push('data-info-userdata');
user.push('gongyangyu');
user.push('langneng');

UserService.append( user )
    .done( function( result ) {
         console.log( result );
     } ).error( function( err ) {
         console.log( err );
     } );
```

* `补充说明`：
1. 使用ModelProxy调用hsf服务时，其所需要的参数类型及结构由hsf服务提供者决定。当服务提供者使用java发布service时，其参数要求有确定的数据类型，关于java和js之间的数据类型转换，请参考[node-hsf之Java 对象与 Node 的对应关系以及调用方法章节](http://gitlab.alibaba-inc.com/node/node-hsf/tree/master)。推荐使用[js-to-java](https://github.com/node-modules/js-to-java)来辅助编写Java对象。关于hsf的相关说明请参考[HSF项目说明](http://confluence.taobao.ali.com/pages/viewpage.action?pageId=819280)。此外，您可以使用[HSF服务治理](http://ops.jm.taobao.net/service-manager/service_search/index.htm?envType=daily)查询相关服务接口，并且使用[Nexus](http://mvnrepo.taobao.ali.com/nexus/index.html#welcome)查询并获得相关jar包。
2. hsf 的mock方法与其他类型代理无区别，且可以参照例六直接在浏览器端调用hsf service

### 完整实例请查看 [demo](demo/)

## 配置文件详解
---
### interface.json 配置结构

``` js
{
    "title": "pad淘宝项目数据接口集合定义",       // [必填][string] 接口文档标题
    "version": "1.0.0",                      // [必填][string] 版本号
    "engine": "river-mock",                  // [选填][string] mock引擎，取值可以是river-mock和mockjs。不需要mock数据时可以不配置
    "rulebase": "interfaceRules",            // [选填][string] mock规则文件夹名称。不需要mock数据时可以不配置。约定该文件夹与
                                             // interface.json配置文件位于同一文件夹。默认为interfaceRules
    "status": "prod",                        // [必填][string] 全局代理状态，取值只能是 interface.urls中出现过的键值或者mock
    "hsf": {                                 // hsfClient相关配置，不需要时可以不配置。参考node-hsf
        "configServers": {                   // hsf服务器配置地址，哪一个地址被启用取决于 status字段
            "prod": "commonconfig.config-host.taobao.com",
            "daily": "10.232.16.8",          
            "prep": "172.23.226.84"
        },
        "connectTimeout": 3,                 // [选填][number] 建立连接超时时间，默认为3秒
        "responseTimeout": 3,                // [选填][number] 响应超时时间，默认为3秒
        "routeInterval": 60,                 // [选填][number] 向configSvr重新请求服务端地址、更新地址列表的间隔时间，默认为1分钟
        "snapshot": false,                   // [选填][boolean] 是否使用快照功能，使用快照则在启动的时候如果无法连接到config
                                             // server，则读取本地缓存的服务者地址。默认false
        "logOff": true,                      // [选填][boolean] 是否关闭日志。默认false
        "keepAlive": true,                   // [选填][boolean] 此client下生成的所有consumer是否与服务端维持长连接，默认为true
        "noDelay": true                      // [选填][boolean] 设置此client下生成的所有consumer是否关闭nagle算法，默认为true
    },

    "interfaces": [ {
        // 此处设置每一个interface的具体配置
        // ... 不同类型的接口配置方法见下文
    } ]
}
```

### http interface 配置

``` js
 {
    "name": "获取购物车信息",               // [选填][string] 接口名称
    "desc": "接口负责人: 善繁",             // [选填][string] 接口描述
    "version": "0.0.1",                  // [选填][string] 接口版本号，发送请求时会带上版本号字段
    "type": "http",                      // [必填][string] 接口类型，取值可以是http或者hsf，使用http接口时其值必须为http
    "id": "cart.getCart",                // [必填][string] 接口ID，必须由英文单词+点号组成
    "urls": {                            // [如果ruleFile不存在, 则必须有一个地址存在][object] 可供切换的url集合
      "prod": "http://url1",             // 线上地址
      "prep": "http://url2",             // 预发地址
      "daily": "http://url3",            // 日常地址
    },
    "ruleFile": "cart.getCart.rule.json",// [选填][string] 对应的数据规则文件，当Proxy Mock状态开启时回返回mock数据
                                         // 不配置时默认为id + ".rule.json"。
    "isRuleStatic": true,                // [选填][boolean] 数据规则文件是否为静态，即在开启mock状态时，程序会将ruleFile
                                         // 按照静态文件读取, 而非解析该规则文件生成数据，默认为false
    "engine": "mockjs"                   // [选填][string] mock引擎，取值可以是river-mock和mockjs。覆盖全局engine
    "status": "prod",                    // [选填][string] 当前代理状态，可以是urls中的某个键值(prod, prep, daily)
                                         // 或者mock或mockerr。如果不填，则代理状态依照全局设置的代理状态；如果设置为mock，
                                         // 则返回 ruleFile中定义response内容；如果设置为mockerr，则返回ruleFile中定义
                                         // 的responseError内容。
    "method": "post",                    // [选填][string] 请求方式，取值post|get 默认get
    "dataType": "json",                  // [选填][string] 返回的数据格式， 取值 json|text|jsonp，仅当
                                         // bypassProxyOnClient设置为true时，jsonp才有效，否则由Node端发送的请求按json格
                                         // 式返回数据。默认为json
    "isCookieNeeded": true,              // [选填][boolean] 是否需要传递cookie默认false
    "encoding": "utf8",                  // [选填][string] 代理的数据源编码类型。取值可以是常用编码类型'utf8', 'gbk', 
                                         // 'gb2312' 或者 'raw' 如果设置为raw则直接返回2进制buffer，默认为utf8
                                         //  注意，不论数据源原来为何种编码，代理之后皆以utf8编码输出
    "timeout": 5000,                     // [选填][number] 延时设置，默认10000
    "intercepted": true,                 // [选填][boolean] 是否拦截请求。当设置为true时，如果在Node端启用了ModelProxy拦截器
                                         // (见例六),则浏览器端可以直接通过interface id访问该接口，否则无法访问。默认为true
    "bypassProxyOnClient": false,        // [选填][boolean] 在浏览器端使用ModelProxy请求数据时是否绕过代理而直接请求原地址。
                                         // 当且仅当status 字段不为mock或者mockerr时有效。默认 false

}

```

### hsf interface 配置

``` js
{
    "name": "获取购物车信息",               // [选填][string] 接口名称
    "desc": "接口负责人: xxx",             // [选填][string] 接口描述
    "version": "0.0.1.daily",            // [选填][string] 接口版本号，发送请求时会带上版本号字段
    "type": "hsf",                       // [必填][string] 接口类型，取值可以是http或者hsf，配置hsf接口时其值必须为hsf
    "id": "UserData.append",             // [必填][string] 接口ID，必须由英文单词+点号组成
    "service": "com.taobao.uic.common.service.userdata.UicDataService",  // 服务名
    "methodName": "insertData",          // [必填][string] 服务方法名
    "method": "POST",                    // [选填][string] 当需要在浏览器端通过ModelProxy调用该接口时，需要指定method类型
                                         // 取值可能是 POST 和 GET。默认GET
    "ruleFile": "cart.getCart.rule.json",// [选填][string] 对应的数据规则文件，当Proxy Mock状态开启时回返回mock数据
                                         // 不配置时默认为id + ".rule.json"。
    "isRuleStatic": true,                // [选填][boolean] 数据规则文件是否为静态，即在开启mock状态时，程序会将ruleFile
                                         // 按照静态文件读取, 而非解析该规则文件生成数据，默认为false
    "intercepted": true,                 // [选填][boolean] 是否拦截请求。当设置为true时，如果在Node端启用了ModelProxy拦截器
                                         // (见例六),则浏览器端可以直接通过interface id访问该接口，否则无法访问。默认为true
    "dataType": "json",                  // [选填][string] 数据返回类型。注意：此字段用于在浏览器使用ModelProxy调用该接口时指定的
                                         // 返回数据类型。 在Node端，hsf返回的数据类型由java service本身返回的类型决定
    "group": "hsf",                      // [选填][string] group服务分组，默认为hsf，一般不需要更改
    "connectTimeout": 3,                 // [选填][number] 建立连接超时时间，默认为3秒
    "responseTimeout": 3,                // [选填][number] 响应超时时间，默认为3秒
    "routeInterval": 60,                 // [选填][number] 向configSvr重新请求服务端地址、更新地址列表的间隔时间，默认为1分钟
    "keepAlive": true,                   // [选填][boolean] 此consumer是否与服务端维持长连接，默认为true
    "noDelay": true                      // [选填][boolean] 此consumer是否关闭nagle算法，默认为true
}
```

### tms interface 配置

``` js
{
// 设计中...
}
```

### 配置文件中的全局变量引入
需要调用 *ModelProxy.init( path, variables )* 来解析interface.json中引用的变量。其中variables可能从[midway-global](http://gitlab.alibaba-inc.com/midway/midway-global/tree/master)模块读取，也可以是任意指定值。

* 例

variables 对象：

``` js
{
    ...
    status: 'prod'
    hsf: {
        prodArr: '192.168.0.1'
    }
}
```

interface.json 文件有如下配置片段

```js
{  
   ...
   "status": "$status$",
   "hsfurl": "$hsf.prodArr$/getData"
}
```

替换结果为：

```js
{  
   ...
   "status": "prod",
   "hsfurl": "192.168.0.1/getData"
}
```

## API
---

### ModelProxy.init
* ModelProxy.init( path[, variables] ) path为接口配置文件所在的绝对路径, variables 为变量对象，包含interface.
json文件中所引用过的变量。

### ModelProxy 对象创建方式

* 直接new

```js
var model = new ModelProxy( profile );

```

* 工厂创建

```js
var model = ModelProxy.create( profile );
```

### 创建ModelProxy对象时指定的 *profile* 相关形式
* 接口ID  生成的对象会取ID最后'.'号后面的单词作为方法名

```js
ModelProxy.create( 'Search.getItem' );
```

* 键值JSON对象   自定义方法名: 接口ID

```js
ModelProxy.create( {
    getName: 'Session.getUserName',
    getMyCarts: 'Cart.getCarts'
} );
```

* 数组形式 取最后 . 号后面的单词作为方法名
下例中生成的方法调用名依次为: Cart_getItem, getItem, suggest, getName

```js
ModelProxy.create( [ 'Cart.getItem', 'Search.getItem', 'Search.suggest', 'Session.User.getName' ] );

```

* 前缀形式 (推荐使用)

```js
ModelProxy.create( 'Search.*' );
```

### ModelProxy logger设置

```js
ModelProxy.setLogger( logger );
```
不设置logger的情况下会使用console输出日志

### ModelProxy对象方法

* .method( params )
method为创建model时动态生成，参数 params{Object}, 为请求接口所需要的参数键值对。

* .done( callback, errCallback )
接口调用完成函数，callback函数的参数与done之前调用的方法请求结果保持一致.最后一个参数为请求回写的cookie。callback函数中的 this 指向ModelProxy对象本身，方便做进一步调用。errCallback 即出错回调函数（可能会被调用多次）。

* .withCookie( cookies )
如果接口需要提供cookie才能返回数据，则调用此方法来设置请求的cookie{String} (如何使用请查看用例七)

* .error( errCallback )
指定全局调用出错处理函数， errCallback 的参数为Error对象。

* .fail( errCallback )
同 error方法，方便不同的语法使用习惯。

## 如何使用ModelProxy的Mock功能
---
### rule.json文件
当mock状态开启时，mock引擎会读取与接口定义相对应的rule.json规则文件，生成相应的数据。该文件应该位于interface.json配置文件中
ruleBase字段所指定的文件夹中。 (建议该文件夹与interface配置文件同级)

### rule.json文件样式

```js
{
    "request": { // 请求参数列表
        "参数名1": "规则一",       // 具体规则取决于采用何种引擎
        "参数名2": "规则二",
        ...
    },
    "response": 响应内容规则,      // 响应内容规则取决于采用何种引擎
    "responseError": 响应失败规则  // 响应内容规则取决于采用何种引擎
}

```
## 如何为ModelProxy贡献代理插件
完善中...

## [附一] 测试覆盖率
---

 **Overview: `96%` coverage `272` SLOC** 

[modelproxy.js](tests/modelproxy.test.js)            : `98%` coverage `57` SLOC

[interfacemanager.js](tests/interfacemanager.test.js): `98%` coverage `76` SLOC

[proxyfactory](tests/proxyfactory.test.js)           : `93%` coverage `139` SLOC


## [附二] [前后端分离思考与实践](http://ued.taobao.org/blog/2014/04/modelproxy/)

## [附三] 中途岛整体架构图及modelproxy所处位置
![](http://work.taobao.net/attachments/download/2929/Midway.png)


如有任何问题请联系[@善繁](https://work.alibaba-inc.com/work/u/68162)