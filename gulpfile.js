/**
 * 
 */
var gulp = require('gulp');

/**
 * 作用：编译后的js文件同步到bce项目中
 */
// gulp.task('watch', function(){
// 	gulp.watch(['build/**/*.js', '!build/Procfile', '!build/robots.txt', '!settings.*'], function(event){
//         console.log(">>>>>>", event.path);
// 		gulp.src(event.path)//.src(['./build/**/*', '!./build/**/*.map', '!./build/public/**/*', '!./build/bin/', '!./build/settings.*'])
// 		.pipe(gulp.dest('E:/workspace/bce'))
// 	});
// });
gulp.task('watch', function(){
	gulp.watch(['build/routes/*.js'], function(event){
        console.log(">>>>>>", event.path);
		gulp.src('./build/routes/*.js')//.src(['./build/**/*', '!./build/**/*.map', '!./build/public/**/*', '!./build/bin/', '!./build/settings.*'])
		.pipe(gulp.dest('E:/workspace/bce/routes/'))
	});
})