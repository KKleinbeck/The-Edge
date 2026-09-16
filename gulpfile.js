const gulp = require("gulp");
var ts = require("gulp-typescript");
var tsProject = ts.createProject("tsconfig.json");
const less = require("gulp-less");
const replace = require('gulp-replace');

// TODO: constants might want to live in their own file
colours = {
  colorUiMainBackground2: "#2a507a"
}


/* ----------------------------------------- */
/*  Compile SRC
/* ----------------------------------------- */

function compileProject() {
  return tsProject.src().pipe(tsProject()).js.pipe(gulp.dest("./built"));
}

/* ----------------------------------------- */
/*  Compile LESS
/* ----------------------------------------- */

const SIMPLE_LESS = ["styles/*.less"];
function compileLESS() {
  return gulp.src("styles/*.less").pipe(less()).pipe(gulp.dest("./styles/"));
}
const css = gulp.series(compileLESS);

/* ----------------------------------------- */
/*  Build SVGs
/* ----------------------------------------- */

function buildSvgs() {
  // return gulp.src('assets/src/*.svg')
  //   .pipe(template(colors))
  //   .pipe(gulp.dest('assets'));
  let stream = gulp.src('assets/src/*');

  // chain a replace for each token
  Object.entries(colours).forEach(([key, value]) => {
    stream = stream.pipe(replace(`{{${key}}}`, value));
  });

  return stream.pipe(gulp.dest('assets'));
}

/* ----------------------------------------- */
/*  Watch Updates
/* ----------------------------------------- */

function watchUpdates() {
  gulp.watch(SIMPLE_LESS, css);
  gulp.watch(["assets/src/*"], buildSvgs);
  gulp.watch(["src/**/*"], compileProject);
}

/* ----------------------------------------- */
/*  Export Tasks
/* ----------------------------------------- */

exports.default = gulp.series(
  gulp.parallel(compileProject),
  gulp.parallel(buildSvgs),
  gulp.parallel(css),
  watchUpdates,
);
exports.css = css;
