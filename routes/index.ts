import * as Promise from 'bluebird';
import * as Debug from 'debug';
import * as HttpRequest from 'request';
var debug = Debug('yuedun:index');
import { Request, Response } from 'express';
import { default as Blog, IBlog as BlogInstance } from '../models/blog-model';
import { route } from '../utils/route';

export default class Routes {

    /**
     * 测试路由
     */
    @route({
        json: true
    })
    static index(req: Request): Promise.Thenable<any> {
        return Blog.find({ status: 1 }, null, { sort: { '_id': -1 }, skip: 0, limit: 2 })
            .then(data => {
                debug(JSON.stringify(data))
                return data;
            });
    }

    /**
     * 拉钩数据拉取 使用go已实现数据拉取
     */
    // @route({
    //     method: "get",
    //     json: true
    // })
    static lagouPosition(req: Request, res: Response): Promise.Thenable<any> {
        let args = req.query;
        console.log(">>>>>>>>", args);
        
        return new Promise((resolve, reject) => {
            HttpRequest.get('https://m.lagou.com/search.json', {
                qs: {
                    city: args.city,
                    positionName: args.positionName,
                    pageNo: 1,
                    pageSize: 1
                },
                json: true,
                headers: {
                    cookie: '_ga=GA1.2.868381298.1568425609; user_trace_token=20190914094652-86535ba6-d691-11e9-91c2-525400f775ce; LGUID=20190914094652-86535ea3-d691-11e9-91c2-525400f775ce; LG_LOGIN_USER_ID=331375a513278b48052a1b5822f918477bb64f55e874649e; LG_HAS_LOGIN=1; _gid=GA1.2.413117961.1579144546; Hm_lvt_4233e74dff0ae5bd0a3d81c6ccf756e6=1579144546; _ga=GA1.3.868381298.1568425609; Hm_lvt_2f04b07136aeba81b3a364fd73385ff4=1579144546; X_MIDDLE_TOKEN=b8a17d6cd73affcd17491c0c816e9140; JSESSIONID=ABAAAECAAHHAAFD2A02AE4D689659CC281B4B4E986F2CBB; _gat=1; Hm_lpvt_4233e74dff0ae5bd0a3d81c6ccf756e6=1579159461; LGSID=20200116152422-37dcb732-3831-11ea-b2e7-525400f775ce; PRE_UTM=; PRE_HOST=; PRE_SITE=https%3A%2F%2Fm.lagou.com%2Futrack%2FtrackMid.html%3Ff%3Dhttps%253A%252F%252Fm.lagou.com%252Fsearch.html%26t%3D1579159462%26_ti%3D1; PRE_LAND=https%3A%2F%2Fm.lagou.com%2Fsearch.html; LGRID=20200116152422-37dcb8f0-3831-11ea-b2e7-525400f775ce; X_HTTP_TOKEN=d19f45b7e2f1b8bd3649519751f18b54668ac30637; Hm_lpvt_2f04b07136aeba81b3a364fd73385ff4=1579159462',
                    host: 'm.lagou.com',
                    referer: 'https://m.lagou.com/search.html',
                    "user-agent":'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Mobile Safari/537.36',
                }
            }, (err, res)=>{
                if (err) {
                    reject(new Error(err.message));
                    return
                }
                console.log(JSON.stringify(res.body));
                
                resolve(res.body);
            })
        })
    }
}
