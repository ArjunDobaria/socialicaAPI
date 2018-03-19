const express = require('express');
const mysql = require('mysql');
const bodyparser = require('body-parser');
const fs = require('fs');
const SendOtp = require('sendotp');
const sendOtp = new SendOtp('201020AmyuQi4VnjuP5a9d0b68');
const multer = require('multer');
const async = require('async');
var credentials = {connectionLimit: 10};
const app = express();


app.use(express.static(__dirname + '/images'));
app.use(bodyparser.json());
app.use(bodyparser());
app.use(bodyparser({limit: '50mb'}));
app.use(bodyparser.json({limit: '50mb', urlencoded: true}));
app.use(bodyparser.urlencoded({extended: true, limit: '50mb'}));

/**
 * Use express static for getting static files
 * http://localhost:3005/profile/918154012696.png
 * */
app.use('/profile', express.static('Img'))
app.use('/post', express.static('PostImg'));

const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "veroApp",
    multipleStatements: true
});

connection.connect((err) => {
    if (err) {
        console.log(err)
    } else {
        console.log('connected')
    }
});

/**
 * Create Object to store the mobile number as key and OTP as value for particuler User
 * */

var OTPObject = {};

function mysqlPromise(sql) {
    return new Promise(function (resolve, reject) {
        connection.query(sql, (err, res) => {
            if (!err) {
                return resolve(res);
            }
            reject(err);
        })
    });
}

// var a = "911234567890"
// OTPObject[a] = 201547
// console.log(OTPObject['911234567890'])

/**
 * Syntext of sendOTP
 *
 * sendOtp.send(contactNumber, senderId, otp, callback); //otp is optional if not sent it'll be generated automatically
 * sendOtp.retry(contactNumber, retryVoice, callback);
 * sendOtp.verify(contactNumber, otpToVerify, callback);
 *
 * */
app.get('/api', (req, res) => {
    let sql = "select * from user";
    console.log(sql)

    mysqlPromise(sql)
        .then(function (data) {
            return res.status(200).send({message: data})
        }).catch(function (err) {
        return res.status(500).send({message: err})
    })
});

var otp;
var userId;
app.post('/api/login', (req, res) => {
    console.log('Login')
    userId = req.body.userId;
    let user = "select userId from user where userId = '" + req.body.userId + "'";
    console.log(user)
    mysqlPromise(user)
        .then(function () {
            otp = Math.floor(100000 + Math.random() * 900000);
            // otp = parseInt(Math.random() * 999999 );
            sendOtp.send(req.body.userId, "MSGIND", otp, function (error, data, response) {
                if (!error) {
                    console.log(data)
                    if (data.type == "error") {
                        return res.status(500).send({message: data.message})
                    } else {
                        OTPObject[userId] = otp;
                        console.log("New User : ", OTPObject);
                        return res.status(200).send({message: otp})
                    }
                }
                else {
                    return res.status(500).send({message: error})
                }
            });
        }).catch(function (err) {
        return res.status(500).send({message: err})
    })
})


/**
 * Verify OTP
 */
app.post('/api/verify', (req, res) => {
    //not null
    if (req.body.userId != undefined && req.body.otp != undefined) {
        if (OTPObject[req.body.userId] == req.body.otp) {
            return res.status(200).send({message: "OTP verified successfully"})
        } else {
            return res.status(500).send({message: "OTP does not match"})
        }
    }
    else {
        return res.status(500).send({message: "data is undefined"})
    }

})

/**
 * From user will get entry in database if its new user
 * and if it is existing user then get update query from here
 * */
//photo upload
var fileName;
var storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, './Img');
    },
    filename: function (req, file, callback) {
        var ext;
        switch (file.mimetype) {
            case 'image/png':
                ext = 'png';
                fileName = 'png';
                break;
            case 'image/jpeg' || 'image/jpg':
                ext = 'jpg';
                fileName = 'jpg';
                break;
        }
        console.log(req.body.userId)
        callback(null, `${file.originalname}.${ext}`);
    }
});
var upload = multer({storage: storage});

app.post('/api/profile', upload.single('userPhoto'), (req, res) => {
    console.log("Profile api")
    let user = "select * from user where userId = '" + req.body.userId + "'";
    mysqlPromise(user)
        .then(function (data) {
            if (data.length > 0) {
                console.log("User Name from query: " + data[0].userName);
                var uName = "";
                if (req.body.userName === undefined) {
                    uName = data[0].userName;
                } else {
                    uName = req.body.userName
                }

                var status = ""
                if (req.body.userStatus === undefined) {
                    status = "Available"
                } else {
                    status = req.body.userStatus;
                }


                let sql = "UPDATE user SET displayName = '" + req.body.displayName + "', userProfilePhoto = '" + req.body.userId + "." + fileName + "',userName='" + uName + "',status='" + status + "' WHERE userId = '" + req.body.userId + "'";
                console.log(sql)
                mysqlPromise(sql)
                    .then(function () {
                        let sql2 = "select * from user where userId = '" + req.body.userId + "'";
                        mysqlPromise(sql2)
                            .then(function (data) {
                                console.log("update profile: " + data);
                                return res.status(200).send({message: data})
                            }).catch(function (err) {
                            return res.status(500).send({message: err})
                        })
                    }).catch(function (err) {
                    return res.status(500).send({message: err})
                })
            }
            else if (data.length == 0) {
                var uName = "";
                if (req.body.userName === undefined) {
                    var uname = req.body.displayName
                    var names = uname.split(" ");
                    for (var i = 0; i < names.length; i++) {
                        if (i === (names.length - 1)) {
                            uName += names[i] + Date.now();
                        } else {
                            uName += names[i] + ".";
                        }
                    }
                    console.log("UserName : " + uName);
                } else {
                    uName = req.body.userName
                }

                var status = ""
                if (req.body.status === undefined) {
                    status = "Available"
                } else {
                    status = req.body.status;
                }

                let sql = "INSERT INTO `user`(`userId`, `email`, `displayName`,`userProfilePhoto`,`userName`,`status`) VALUES ('" + req.body.userId + "','" + req.body.email + "','" + req.body.displayName + "','" + req.body.userId + "." + fileName + "','" + uName + "','" + status + "')"
                console.log(sql)
                mysqlPromise(sql)
                    .then(function () {
                        let sql2 = "select * from user where userId = '" + req.body.userId + "'";
                        mysqlPromise(sql2)
                            .then(function (data) {
                                console.log("register: " + data)
                                return res.status(200).send({message: data})
                            }).catch(function (err) {
                            return res.status(500).send({message: err})
                        })
                    }).catch(function (err) {
                    return res.status(500).send({message: err})
                })
            }
        }).catch(function (err) {
        return res.status(500).send({message: err})
    })
});


/**
 * GET /api/profile/:userId
 * @params {String} userId
 * */

app.post('/api/following', (req, res) => {
    let sql = "SELECT fuserId FROM friendlist WHERE userId = '" + req.body.userId + "'";
    connection.query(sql, (err, res1) => {
        if (err)
            return res.send({"status": 0, "message": "error " + err})
        else {
            res.send({"status": 1, "message": res1});
        }
    })
})

app.post('/api/postsLiked', (req, res) => {
    let sql = "select distinct(postId) from likes where userId='" + req.body.userId + "'";
    connection.query(sql, (err, data) => {
        if (err)
            return res.send({"status": 0, "message": "error" + err})
        else {
            res.send({"status": 1, "data": data})
        }
    })
})

app.post('/api/userProfile', (req, res) => {
    console.log("User Profile")
    let user = "select * from user where userId = '" + req.body.userId + "'";
    console.log("select profile: " + user)
    mysqlPromise(user)
        .then(function (data) {
            console.log("then ma ave 6");
            if (data.length > 0) {
                console.log(data);
                return res.status(200).send({message: data})
            } else {
                console.log("check it");
                return res.status(500);
            }
        }).catch(function (err) {
        console.log("catch ma ave 6");
        return res.status(500).send({message: err});
    })
})

/**
 * For private post
 *select * from posts WHERE privacy = 1 and userId IN (SELECT userId from friendlist WHERE fuserId = '918154012696');
 * select * from posts WHERE (privacy = 1 AND userId IN (SELECT userId from friendlist WHERE fuserId = '911234567890')) or privacy = 0
 *select p.*,u.displayName from posts p JOIN user u on p.userId=u.userId WHERE (p.privacy = 1 AND p.userId IN (SELECT userId from friendlist WHERE fuserId = '"+req.body.userId+"')) or p.privacy = 0
 * login user post with the public post
 * select * from posts WHERE ((privacy = 1 AND userId IN (SELECT userId from friendlist WHERE fuserId = '911234567890')) or privacy = 0) OR userId = '91123456789'
 */
app.post('/api/posts/private', (req, res) => {
    let sql = "select p.*,u.displayName,u.userProfilePhoto from posts p JOIN user u on p.userId=u.userId WHERE ((p.privacy = 1 AND p.userId IN (SELECT userId from friendlist WHERE fuserId = '" + req.body.userId + "')) or p.privacy = 0) OR p.userId = '" + req.body.userId + "'";
    console.log(sql)
    connection.query(sql, (err, rows) => {
        if (err) {
            return res.send({"status": 0, "message": "problem inserting post : " + err});
        } else {
            let myqueries = '';
            rows.forEach(function (row, index) {
                let sql1 = "select count(*) as comments from comments where postId = " + row.postId + ";select count(*) as likes from likes where postId = " + row.postId + ";";
                myqueries += sql1;
            });
            mysqlPromise(myqueries)
                .then((data) => {
                    return res.status(200).send({data: data, rows: rows})
                })
                .catch((err) => {
                    return res.status(500).send({message: err});
                })
        }
    })
})

/**
 * Search User using this API
 * searcing is using displayName and Email Address
 */
app.post('/api/search', (req, res) => {
    console.log("search")
    let sql = "select displayName,email,userId from user where displayName LIKE '" + req.body.search + "%' OR email LIKE '" + req.body.search + "%'";
    console.log(sql)
    mysqlPromise(sql)
        .then(function (data) {
            return res.status(200).send({message: data})
        }).catch(function (err) {
        return res.status(500).send({message: err})
    })
})

var fileName2;
var storage2 = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, './PostImg');
    },
    filename: function (req, file, callback) {
        var ext;
        switch (file.mimetype) {
            case 'image/png':
                ext = 'png';

                break;
            case 'image/jpeg' || 'image/jpg':
                ext = 'jpg';

                break;
        }
        console.log(req.body.userId)
        fileName2 = `${file.originalname}_${Date.now()}.${ext}`
        callback(null, fileName2);
    }
});
var upload2 = multer({storage: storage2});
app.post('/api/posts', upload2.single('userPhoto'), (req, res) => {
    let sql = "INSERT INTO `posts`(`postType`, `postText`, `postUrl`, `userId`, `privacy`) VALUES ('" + req.body.postType + "','" + req.body.postText + "','" + fileName2 + "','" + req.body.userId + "'," + req.body.privacy + ")";
    mysqlPromise(sql)
        .then(function (data) {
            return res.status(200).send({message: data})
        }).catch(function (err) {
        return res.status(500).send({message: err})
    })
})

/*
counting how many likes are there for a particular post
select count(*) from likes WHERE postId = 2

getting users name who liked a particular post
select user.displayName from user INNER JOIN likes on user.userId=likes.userId WHERE postId = 1

getting users name and comment who commented on a particular post
select user.displayName,comments.commentText from user INNER JOIN comments on user.userId=comments.userId WHERE postId = 1

counting how many comments are there for a particular post
select count(*) from comments WHERE postId = 1
 */

/**
 * For every comments
 */
app.post('/api/comments/post', (req, res) => {
    let sql = "select user.displayName,comments.commentText from user INNER JOIN comments on user.userId=comments.userId WHERE postId = '" + req.body.postId + "'";
    connection.query(sql, (err, rows) => {
        if (err) {
            return res.send({"status": 0, "message": "problem commenting : " + err});
        } else {
            return res.send({"status": 1, "message": rows});
        }
    })
})

app.post('/api/comments', (req, res) => {
    let sql = "INSERT INTO `comments`(`commentText`, `userId`, `postId`) VALUES ('" + req.body.commentText + "','" + req.body.userId + "'," + req.body.postId + ")";
    connection.query(sql, (err, rows) => {
        if (err) {
            return res.send({"status": 0, "message": "problem commenting : " + err});
        } else {
            // res.send({"status":1,"message":"comment added successfully"});
            //shoe comments
            /**
             * select user.displayName,comments.commentText from user INNER JOIN comments on user.userId=comments.userId WHERE postId = 1 AND comments.userId = '918154012696' ORDER BY comments.createdAt;
             * */
            let sql1 = "select user.displayName,comments.commentText,user.userProfilePhoto from user INNER JOIN comments on user.userId=comments.userId WHERE postId = " + req.body.postId + " AND comments.userId = '" + req.body.userId + "' ORDER BY comments.createdAt ;";
            console.log("select query: " + sql1);
            connection.query(sql1, (err1, rows1) => {
                if (err1) {
                    return res.send({"status": 0, "message": "problem commenting : " + err1});
                } else {
                    return res.send({"status": 1, "message": rows1});
                }
            })
        }
    })
})

/**
 * For all liked user
 * */
app.post('/api/likes/post', (req, res) => {
    let sql = "select user.displayName from user INNER JOIN likes on user.userId=likes.userId WHERE postId = " + req.body.postId + " group by likes.userId";
    connection.query(sql, (err, rows) => {
        if (err) {
            return res.send({"status": 0, "message": "problem commenting : " + err});
        } else {
            return res.send({"status": 1, "message": rows});
        }
    })
})

app.post('/api/likes', (req, res) => {
    if (req.body.postId != undefined && req.body.userId != undefined) {
        let sql = "INSERT INTO `likes`(`postId`, `userId`) VALUES (" + req.body.postId + ",'" + req.body.userId + "')";
        mysqlPromise(sql)
            .then(function (data) {
                return res.status(200).send({message: "Success"})
            }).catch(function (err) {
            return res.status(500).send({message: err})
        })
    } else {
        return res.status(500).send({message: "data is undefined"})
    }
})

app.post('/api/follow', (req, res) => {
    let sql = "INSERT INTO `friendlist`(`userId`, `fuserId`) VALUES ('" + req.body.userId + "','" + req.body.fuserId + "')";
    connection.query(sql, (err, rows) => {
        if (err) {
            return res.send({"status": 0, "message": "problem following : " + err});
        } else {
            return res.send({"status": 1, "message": "following user"});
        }
    })
})

app.post('/api/updateUser', (req, res) => {
    let sql = "UPDATE `user` SET `userProfilePhoto`=[value-3],`status`='" + req.body.status + "',`displayName`='" + req.body.displayName + "' where userId='" + req.body.userId + "'";
    connection.query(sql, (err, rows) => {
        if (err) {
            return res.send({"status": 0, "message": "problem updating user : " + err});
        } else {
            return res.send({"status": 1, "message": "user updated successfully"});
        }
    })
})


/***  Hardik's Route  ***/
/**
 * GET /api/post/{userId}
 * to get a post for particular user
 * */
app.get('/api/post/:userId', (req, res) => {
    //let sql = "select p.*,u.displayName,u.userProfilePhoto from posts p JOIN user u on p.userId=u.userId WHERE ((p.privacy = 1 AND p.userId IN (SELECT userId from friendlist WHERE fuserId = '" + req.body.userId + "')) or p.privacy = 0) OR p.userId = '" + req.body.userId + "'";
    // let sql = "select posts.*,user.displayName,user.userProfilePhoto from posts,user where (privacy = 1 AND posts.userId IN (SELECT userId from friendlist WHERE fuserId = '" + req.params.userId + "') or privacy = 0) OR posts.userId = '" + req.params.userId + "' and user.userId=posts.userId GROUP BY posts.postId order by posts.createdAt desc"
    // let sql = "select posts.*,user.displayName,user.userProfilePhoto, count(likes.likeId) as userLike from (posts INNER JOIN user on posts.userId=user.userId) INNER JOIN likes ON posts.postId=likes.postId where (privacy = 1 AND posts.userId IN (SELECT userId from friendlist WHERE fuserId = '918238730884') or privacy = 0) OR posts.userId = '918238730884' and user.userId=posts.userId  and likes.postId=posts.postId and likes.userId='918238730884' GROUP BY posts.postId"

    let sql = "select p.*,u.displayName,u.userProfilePhoto from posts p JOIN user u on p.userId=u.userId WHERE ((p.privacy = 1 AND p.userId IN (SELECT userId from friendlist WHERE fuserId = '" + req.params.userId + "')) or p.privacy = 0) OR p.userId = '" + req.params.userId + "' order by p.createdAt desc";
    console.log(sql)
    mysqlPromise(sql)
        .then((data) => {
            return res.status(200).send({message: data})
        })
        .catch((err) => {
            return res.status(500).send({message: err});
        })
})

/*app.get('/api/post/:userId', (req, res) => {
    //let sql = "select p.*,u.displayName,u.userProfilePhoto from posts p JOIN user u on p.userId=u.userId WHERE ((p.privacy = 1 AND p.userId IN (SELECT userId from friendlist WHERE fuserId = '" + req.body.userId + "')) or p.privacy = 0) OR p.userId = '" + req.body.userId + "'";
    let sql = "select posts.*,user.displayName,user.userProfilePhoto from posts,user where (privacy = 1 AND posts.userId IN (SELECT userId from friendlist WHERE fuserId = '" + req.params.userId + "') or privacy = 0) OR posts.userId = '" + req.params.userId + "' and user.userId=posts.userId GROUP BY posts.postId"
    // let sql = "select posts.*,user.displayName,user.userProfilePhoto, count(likes.likeId) as userLike from (posts INNER JOIN user on posts.userId=user.userId) INNER JOIN likes ON posts.postId=likes.postId where (privacy = 1 AND posts.userId IN (SELECT userId from friendlist WHERE fuserId = '918238730884') or privacy = 0) OR posts.userId = '918238730884' and user.userId=posts.userId  and likes.postId=posts.postId and likes.userId='918238730884' GROUP BY posts.postId"
    console.log(sql)
    var resData=[];
    mysqlPromise(sql)
        .then((data) => {
            data.forEach(function (dt, index) {
                let count = "select count(likeId) as userLike from likes where userId='" + req.params.userId + "' and postId=" + dt.postId
                connection.query(count)
                    .then((cdata) => {
                        data[index].userLike = cdata[0].userLike;
                        console.log(data[index]);
                        resData.push(data[index])
                    })
                    .catch((err) => {
                        return res.status(500).send({message: err});
                    })
            });
            return res.status(200).send({message: data})
        })
        .catch((err) => {
            return res.status(500).send({message: err});
        })
})*/

/**
 * GET /api/post/likes/{postId}
 * get list of all user like a post
 * @param {String} postId unique id of post
 * @return {Object} object which contains list of user who liked post
 * */
app.get('/api/post/likes/:postId', (req, res) => {
    let sql = "select user.displayName,user.userProfilePhoto,count(likes.likeId) from likes inner join user on likes.userId=user.userId where likes.postId=" + req.params.postId + " GROUP BY user.userId "
    console.log(sql)
    mysqlPromise(sql)
        .then((data) => {
            return res.status(200).send({message: data})
        })
        .catch((err) => {
            return res.status(500).send({message: err});
        })
});

/**
 * GET /api/post/comment/{postId}
 * get list of all comment of post
 * @param {String} postId unique id of post
 * @return {Object} object which contains list of comment and user who post comment
 * */
app.get('/api/post/comments/:postId', (req, res) => {
    let sql = "select user.displayName,user.userProfilePhoto,comments.* from comments inner join user on comments.userId=user.userId where comments.postId=" + req.params.postId;
    console.log(sql)
    mysqlPromise(sql)
        .then((data) => {
            return res.status(200).send({message: data})
        })
        .catch((err) => {
            return res.status(500).send({message: err});
        })
});


/**
 * POST /api/comment/post
 * @param {String} comment comment_content
 * @param {String} postId for which post
 * @param {String} userId from which user
 * */
app.post('/api/comment/post', (req, res) => {
    console.log("start")
    let sql = "INSERT INTO `comments`(`commentText`, `userId`, `postId`) VALUES ('" + req.body.commentText + "','" + req.body.userId + "'," + req.body.postId + ")";
    console.log("SQL: "+sql)
    mysqlPromise(sql)
        .then((data) => {
            return res.status(200).send({message: "Success"})
        })
        .catch((err) => {
            return res.status(500).send({message: err});
        });
})

/**
 * GET /api/search/:query
 * get user list who match query with display_name,username,email and phone
 * @param {String} query content for search
 * */
app.get('/api/search/:query', (req, res) => {
    console.log("start search");
    let sql = "SELECT * from user WHERE userId like '%" + req.params.query + "%' or userName like '%" + req.params.query + "%' or displayName like '%" + req.params.query + "%' or email like '%" + req.params.query + "%' ORDER BY userName"
    console.log("search: "+sql)
    mysqlPromise(sql)
        .then((data) => {
            return res.status(200).send({message: data})
        })
        .catch((err) => {
            return res.status(500).send({error: err});
        })
})

app.listen(3005, () => {
    console.log(`3005`)
});