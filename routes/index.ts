import * as Promise from 'bluebird';
import * as moment from 'moment';
import * as formidable from 'formidable';
import * as Debug from 'debug';
var debug = Debug('yuedun:index');
import { Request, Response } from 'express';
import { default as Blog, IBlog as BlogInstance } from '../models/blog-model';
import { uploadFile, uptoken } from '../utils/qiniu';
import { route } from '../utils/route';
import {qiniuConfig} from '../settings';

export default class Routes {

    @route({
        json: true
    })
    static index(req: Request): Promise.Thenable<any> {
        return Blog.findOne()
            .then(data => {
                console.log(JSON.stringify(data))
                return data;
            });
    }

    @route({
        method: "post",
        json: true
    })
    static uploadImg(req: Request, res: Response, next: Function): Promise.Thenable<any> {
        console.log(">>>>>>>>>>>>>upload");
        var token = uptoken(qiniuConfig.bucketName);
        var form = new formidable.IncomingForm();

        return new Promise((resolve, reject) => {
            form.parse(req, function (err, fields, files) {
                if (!err) {
                    resolve(files)
                } else {
                    reject(err)
                }
                //{"editormd-image-file":{"size":390555,"path":"C:\\Users\\ADMINI~1\\AppData\\Local\\Temp\\upload_bfe95c754c06d69b3a4c910a315032ae","name":"微信图片_20170515182352.png","type":"image/png","mtime":"2017-05-16T09:21:12.147Z"}}
            });
        }).then((files: any) => {
            let file = files['editormd-image-file'].path;
            let suffix = file.substr(file.lastIndexOf("."));
            // let file_name = moment().format("YYYY-MM-DD_HHmmSS") + suffix;
            let file_name = files['editormd-image-file'].name;
            return uploadFile(file, file_name, token)
                .then(data => {
                    console.log(JSON.stringify(data));
                    
                    return Promise.resolve({
                        success: 1,           // 0 表示上传失败，1 表示上传成功
                        message: "",//提示的信息，上传成功或上传失败及错误信息等。
                        url: qiniuConfig.url + data.key        // 上传成功时才返回
                    })
                })
        })
    }
}
