import * as _ from 'lodash';
import { Request, Response } from 'express';
import * as Moment from 'moment';//日期格式化组件
import * as Async from 'async';
import * as Promise from 'bluebird';
import { default as User } from '../models/user-model';
import { default as Blog, IBlog as BlogInstance } from '../models/blog-model';
import { default as QuickNote } from '../models/quick-note-model';
import { default as Category, ICategory as CategoryInstance } from '../models/category-model';
import { default as WeatherUser } from '../models/weather-user-model';
import * as qiniu from '../utils/qiniu';
import * as Markdown from 'markdown-it';
var md = Markdown();
var area = require('../area');
import { default as PvModel } from '../models/viewer-log-model';
import { route } from '../utils/route';

export default class Routes {
    /**
     * success0未修改，1成功
     * 
    **/

    /*进入后台主界面 */
    @route({
        path: "/",
        method: "get"
    })
    static home(req: Request, res: Response): Promise.Thenable<any> {
        var user = req.session ? req.session.user : {};
        if (user != null) {
            return Promise.resolve({ title: '后台管理首页', user: user });
        } else {
            return Promise.resolve({ title: '用户登录' });
        }
    }

    /* 后台登陆 */
    @route({
        path: "/login",
        method: "get"
    })
    static login(req: Request, res: Response): Promise.Thenable<any> {
        return Promise.resolve({});
    }

    //登陆
    @route({
        path: "/doLogin",
        method: "post"
    })
    static doLogin(req: Request, res: Response): void {
        var object = req.body;
        var user = {
            username: object.username,
            password: object.password
        }
        User.findOne(user, function (err, obj) {
            if (obj || process.env.NODE_ENV === 'development') {
                req.session.user = user;
                if (object.remeber) {
                    res.cookie('autologin', 1, {
                        expires: new Date(Date.now() + 864000000)//10天
                    });
                }
                res.redirect('/admin/blogList');
            } else {
                res.redirect('/admin/login');
            }
        });
    }

    /**
     * 跳转到新建文章页面
     */
    @route({
        path: "/newArticleUi",
        method: "get"
    })
    static newArticleUi(req: Request, res: Response): Promise.Thenable<any> {
        var token = qiniu.uptoken('hopefully');
        return Category.find({})
            .then(catotory => {
                return Promise.resolve({ success: 0, categories: catotory, token: token });
            })
    }
    /**
     * 新建文章
     * success代表新建成功时提示
     */
    @route({
        path: "/newArticle",
        method: "post"
    })
    static newArticle(req: Request, res: Response): Promise.Thenable<any> {
        var content = req.body.content;
        var blog = new Blog({
            title: req.body.title,//标题
            createDate: Moment().format('YYYY-MM-DD HH:mm:ss'),//发表时间
            content: content, //内容
            status: req.body.status,//发布，草稿，
            comments: [],//评论，可以在评论时添加
            commentCount: 0,
            category: req.body.category,//分类
            top: 0,//置顶
            tags: req.body.tags,//标签
            pv: 0,//浏览次数，可以在浏览时添加
            ismd: req.body.ismd
        });
        return Category.findOne({ cateName: req.body.category })
            .then(category => {
                if (!category) {
                    var category = new Category({
                        cateName: req.body.category,
                        state: true,
                        createDate: Moment().format('YYYY-MM-DD HH:mm:ss')
                    });
                    return category.save();
                } else {
                    return category;
                }
            }).then(category => {
                return blog.save();
            }).then(() => {
                console.log(">>>>>>>>>>>>");

                res.redirect('/admin/blogList?success=1');
            })
    }
    /**
     * 跳转到新建文章页面-markdown方式
     */
    @route({
        path: "/newArticleMd",
        method: "get"
    })
    static newArticleMd(req: Request, res: Response): Promise.Thenable<any> {
        var token = qiniu.uptoken('hopefully');
        return Category.find({})
            .then(catogory => {
                return Promise.resolve({ success: 0, categories: catogory, token: token });
            });
    }

    /**
     *文章列表
     */
    @route({
        path: "/blogList",
        method: "get"
    })
    static blogList(req: Request, res: Response): Promise.Thenable<any> {
        var user = req.session ? req.session.user : null;
        var success = req.query.success || 0;
        var pageIndex = 1;
        var pageSize = 10;
        pageIndex = req.query.pageIndex ? req.query.pageIndex : pageIndex;
        pageSize = req.query.pageSize ? req.query.pageSize : pageSize;
        return Blog.find({}, null, { sort: { '_id': -1 }, skip: (pageIndex - 1) * pageSize, limit: ~~pageSize })
            .then(docs => {
                docs.forEach(function (item, index) {
                    if (item.content) {
                        if (item.ismd) {
                            item.content = md.render(item.content).replace(/<\/?.+?>/g, "").substring(0, 300);
                        } else {
                            item.content = item.content.replace(/<\/?.+?>/g, "").substring(0, 300);
                        }
                    };
                });
                res.render('admin/bloglist', { success: success, blogList: docs, user: user, pageIndex: pageIndex, pageCount: docs.length });
            })
    }
    /**
     * 查看单篇博客内容
     */
    @route({
        path: "/blogDetail/:id",
        method: "get"
    })
    static blogDetail(req: Request, res: Response): Promise.Thenable<any> {
        var user = req.session.user;
        return Blog.findById(req.params.id)
            .then(doc => {
                if (doc.ismd) {
                    doc.content = md.render(doc.content);
                }
                return Promise.resolve({ blog: doc, user: user });
            })
    }
    /**
     * 删除文章
     */
    @route({
        path: "/deleteBlog/:id",
        method: "delete"
    })
    static deleteBlog(req: Request, res: Response): Promise.Thenable<any> {
        var user = req.session.user;
        return Blog.findByIdAndRemove(req.params.id)
            .then(doc => {
                res.redirect('/admin/blogList');
            })
    }
    /**
     * 跳转到修改文章
    /* 使用async方式修改文章 */
    @route({
        path: "/toEditArticle/:id",
        method: "get"
    })
    static toEditArticle(req: Request, res: Response): void {
        var token = qiniu.uptoken('hopefully');
        let getBlogById = new Promise((resolve, reject) => {
            Blog.findById(req.params.id, function (err, doc) {
                if (err) reject(err);
                resolve(doc);
            });
        })
        let getCategory = new Promise((resolve, reject) => {
            Category.find({}, function (err, docs) {
                if (err) reject(err);
                resolve(docs);
            });
        })

        Promise.all([getBlogById, getCategory])
            .then(([blogObj, categories]: [BlogInstance, CategoryInstance[]]) => {
                if (blogObj.ismd) {
                    res.render('admin/editarticlemd', { success: 0, blog: blogObj, categories: categories, token: token });
                } else {
                    res.render('admin/editarticle', { success: 0, blog: blogObj, categories: categories, token: token });
                }
            })
    }
    /**
     * 修改操作
     */
    @route({
        path: "/editArticle/:id",
        method: "get"
    })
    static editArticle(req: Request, res: Response): void {
        var content = req.body.content;
        Blog.findByIdAndUpdate(req.params.id, {
            $set:
            {
                title: req.body.title,
                content: content,
                category: req.body.category,
                tags: req.body.tags,
                status: req.body.status,
                updateTime: Moment().format('YYYY-MM-DD HH:mm:ss')
            }
        }, function (err, doc) {
            if (err) res.send(err.message);
            res.redirect('/admin/blogDetail/' + req.params.id);
        });
    }
    /**
     * 分类
     */
    @route({
        path: "/category",
        method: "get"
    })
    static category(req: Request, res: Response): void {
        Category.find({}, function (err, docs) {
            if (err) res.send(err.message);
            res.render('admin/category', { user: req.session.user, cates: docs });
        });
    }

    @route({
        path: "/addCategory",
        method: "post"
    })
    static addCategory(req: Request, res: Response): void {
        var category = new Category();
        category.cateName = req.body.cateName;
        category.state = true;
        category.createDate = Moment().format('YYYY-MM-DD HH:mm:ss');
        category.save(function (e, docs, numberAffected) {
            if (e) res.send(e.message);
            res.redirect('/admin/category');
        });
    }
    /**
     * 删除分类
     */
    @route({
        path: "/deleteCate/:id",
        method: "get"
    })
    static deleteCate(req: Request, res: Response): void {
        var user = req.session.user;
        Category.findByIdAndRemove(req.params.id, function (err) {
            res.redirect('/admin/category');
        });
    }

    //添加用户界面
    @route({
        path: "/addUserUi",
        method: "get"
    })
    static addUserUi(req: Request, res: Response): void {
        res.render('admin/adduser', { success: 0, flag: 0, user: req.session.user });
    }

    /**
     * 新增用户
     */
    @route({
        path: "/addUser",
        method: "post"
    })
    static addUser(req: Request, res: Response): void {
        var password = req.body.password;
        var user = new User({
            username: req.body.username,
            nickname: req.body.nickname,
            password: password,
            level: 1,//权限级别，最高
            state: true,//可用/停用
            createDate: Moment().format('YYYY-MM-DD HH:mm:ss')
        });
        user.save(function (e, docs, numberAffected) {
            if (e) res.send(e.message);
            res.render('admin/adduser', { success: 1, user: req.session.user });
        });
    }
    /**
     * 查看用户列表
     */
    @route({
        path: "/viewUser",
        method: "get"
    })
    static viewUser(req: Request, res: Response): void {
        User.find({}, null, function (err, docs) {
            if (err) res.send(err.message);
            res.render('admin/viewuser', { users: docs, user: req.session.user });
        });
    }
    /**
     * 跳转到修改页面success:0未成功1成功flag:0添加1修改
     */
    @route({
        path: "/toModifyUser/:userId",
        method: "get"
    })
    static toModifyUser(req: Request, res: Response): void {
        User.findById(req.params.userId, function (err, doc) {
            if (err) res.send(err.message);
            res.render('admin/modifyuser', {
                user: doc,
                success: 0,
                flag: 1
            });
        });
    }
    /**
     * 进行修改用户
     * findByIdAndUpdate的callback函数有两个参数1错误信息，2修改后的对象
     */
    @route({
        path: "/modifyUser/:userId",
        method: "post"
    })
    static modifyUser(req: Request, res: Response): void {
        User.findByIdAndUpdate(req.params.userId, {
            $set:
            {
                username: req.body.username,
                nickname: req.body.nickname,
                password: req.body.password,
                updateDate: Moment().format('YYYY-MM-DD HH:mm:ss')
            }
        }, function (err, doc) {
            if (err) res.send(err.message);
            res.render('admin/modifyuser', { user: doc, success: 1, flag: 1 });
        });
    }
    /*
     *删除用户
     */
    @route({
        path: "/deleteUser/:userI",
        method: "get"
    })
    static deleteUser(req: Request, res: Response): void {
        User.remove({ _id: req.params.userId }, function (err) {
            res.redirect('/admin/viewUser');
        });

    }
    /*  登出  */
    @route({
        path: "/logout",
        method: "get"
    })
    static logout(req: Request, res: Response): void {
        req.session.user = null;
        res.clearCookie("autologin");
        res.redirect('/admin/login');
    }
    /*  测试路由  */
    @route({
        path: "/test",
        method: "get"
    })
    static test(req: Request, res: Response): void {
        res.render('admin/menu', {});
    }

    //添加用户界面
    @route({
        path: "/addWeatherUser",
        method: "get"
    })
    static addWeatherUserUi(req: Request, res: Response): void {
        res.render('admin/addweatheruser', { success: 0, flag: 0, user: req.session.user });
    }
    /**
     * 新增天气预报用户weatherUserList
     */
    @route({
        path: "/addWeatherUser",
        method: "post"
    })
    static addWeatherUser(req: Request, res: Response): void {
        var args = req.body;
        // var areaObjs = JSON.parse(area);
        var areaId = _.result(_.find(area, { 'NAMECN': args.city }), 'AREAID');
        var weathUser = new WeatherUser({
            username: args.username,
            mobile: args.mobile,
            city: args.city,
            cityCode: areaId,
            sendCount: 0,
            status: 1,//1可用/0停用
            createAt: Moment().format('YYYY-MM-DD HH:mm:ss'),
        });
        weathUser.save(function (e, docs, numberAffected) {
            if (e) res.send(e.message);
            res.render('admin/addweatheruser', { success: 1, user: req.session.user });
        });
    }
    /**
     * 查看天气用户列表
     */
    @route({
        path: "/weatherUserList",
        method: "get"
    })
    static weatherUserList(req: Request, res: Response): void {
        WeatherUser.find({}, null, function (err, docs) {
            if (err) res.send(err.message);
            res.render('admin/weatherUser', { wusers: docs, user: req.session.user });
        });
    }

    /*
     *删除天气用户
     */
    @route({
        path: "/delWeatherUser/:userId",
        method: "get"
    })
    static delWeatherUser(req: Request, res: Response): void {
        WeatherUser.remove({ _id: req.params.userId }, function (err) {
            res.redirect('/admin/weatherUserList');
        });
    }
    /**
     * 新增速记
     */
    @route({
        path: "/quicknote",
        method: "get"
    })
    static quicknote(req: Request, res: Response): void {
        var quicknote = new QuickNote({
            content: req.body.content,
            state: true,//可用/停用
            createDate: Moment().format('YYYY-MM-DD HH:mm:ss')
        });
        quicknote.save(function (e, docs, numberAffected) {
            if (e) res.send(e.message);
            res.redirect('/admin/quickNoteList');
        });
    }
    /*
     * 速记列表
     */
    @route({
        path: "/quickNoteList",
        method: "get"
    })
    static quickNoteList(req: Request, res: Response): void {
        var user = req.session.user;
        var success = req.query.success || 0;
        var pageIndex = 1;
        var pageSize = 10;
        pageIndex = req.query.pageIndex ? req.query.pageIndex : pageIndex;
        pageSize = req.query.pageSize ? req.query.pageSize : pageSize;
        QuickNote.find({}, null, { sort: { '_id': -1 }, skip: (pageIndex - 1) * pageSize, limit: ~~pageSize }, function (err, docs) {
            if (err) {
                res.send(err.message);
                return;
            }
            docs.forEach(function (item, index) {
                if (item.content) {
                    item.content = item.content.replace(/<\/?.+?>/g, "").substring(0, 300);
                };
            });
            res.render('admin/quicknote', { success: success, noteList: docs, user: user, pageIndex: pageIndex, pageCount: docs.length });
        });
    }

    /**
     * 访问统计
     */
    @route({
        path: "/readCount",
        method: "get"
    })
    static readCount(req: Request, res: Response): void {
        var today = Moment().format('YYYY-MM-DD');
        Async.parallel([
            function (callback) {
                Blog.aggregate({ $group: { _id: null, pvCount: { $sum: '$pv' } } }, function (err: any, doc: any) {
                    callback(err, doc[0].pvCount);
                });
            },
            function (callback) {
                //模糊查询"%text%"
                PvModel.count({ createdAt: { $regex: today, $options: 'i' } }, function (err, count) {
                    callback(err, count)
                });
            }
        ], function (err, result) {
            res.render('admin/readcount', { readCount: result[0], todayRead: result[1] });
        })
    }
}










