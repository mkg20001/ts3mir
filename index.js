const request=require("request")

const basePath="http://dl.4players.de/ts/releases/"

const w=require("./w")

const mkdirp=require("mkdirp")
const path=require("path")
const fs=require("fs")

folderEx=/href="(([0-9a-zA-Z_.-]*)\/)"/g //group 2
fileEx=/href="([0-9a-zA-Z_.-]*)"/g //group 1

function match(string, regex, index) {
  index || (index = 1); // default to the first capturing group
  var matches = [];
  var match;
  while (match = regex.exec(string)) {
    matches.push(match[index]);
  }
  return matches;
}

function mirror(current,cb) {
  var url=basePath+current.join("/")+"/"
  var struct={}
  request(url,(err,res,body) => {
    console.log("Mirror %s...",current.join("/"))
    if (err) console.error("ERROR: Failed to load %s: %s",current.join("/"),e.toString())
    folders=match(body,folderEx,2)
    files=match(body,fileEx,1)
    files.map(f => struct[f]=true) //boolean == file
    w(folders,(folder,next) => {
      mirror(current.concat([folder]),(err,st) => {
        struct[folder]=st
        next()
      })
    })(err => {
      if (err) console.error("ERROR: Failed to load %s: %s",current.concat([folder]).join("/"),e.toString())
      cb(null,struct)
    })
  })
}

function getFiles(base,stru,current,cb) {
  const real="/"+base+current.join("/")
  var url=basePath+current.join("/")+"/"
  mkdirp(real,err => {
    console.log("Dl %s",current.join("/"))
    if (err) cb(err)
    var files=[]
    var folders=[]
    for (var p in stru) if (typeof stru[p] == "boolean") files.push(p); else folders.push(p)
    w(files,(file,next) => {
      if (!fs.existsSync(real+file)) {
        console.log("Get %s",url+file)
        request
          .get(url+file)
          .on('error', function(err) {
            console.log(err)
          })
          .pipe(fs.createWriteStream(real+file)).once("close",() => {
            next()
          })
        } else {
          next()
        }
    })(err => {
      if (err) cb(err)
      w(folders,(folder,next) => {
        getFiles(base,stru[folder],current.concat(folder),next)
      })(cb)
    })
  })
}

function download(to) {
  /*

  */
  const cwd=__dirname //TODO: use getcwd()
  mirror([],(err,stru) => {
    if (err) throw err;
    console.log(stru)
    const base=cwd+"/"+to+"/"
    getFiles(base,stru,[],err => {
      if (err) throw err;
      console.log("ALL DOWNLOADED")
    })

  })
}

download("result")
