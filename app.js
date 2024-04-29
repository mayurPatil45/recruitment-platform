const express         = require('express'),
      mongoose        = require('mongoose'),
      passport        = require('passport'),
      LocalStrategy   = require('passport-local'),
      bodyParser      = require('body-parser'),
      flash           = require('connect-flash'),
      Candidate       = require('./models/candidate'),
      Test            = require('./models/test'),
      Question        = require('./models/question'),
      Response        = require('./models/response'),
      Codingproblem   = require('./models/codingproblem'),
      middleware      = require('./middleware');

const app = express();
require('dotenv').config();

app.set('view engine', 'ejs');

var isAdmin = false;

app.use(bodyParser.urlencoded({extended : true}));
app.use(express.static(__dirname + "/public"));

const uri = process.env.mongo_uri;
mongoose.connect(uri, {useNewUrlParser: true, useUnifiedTopology: true});

/*
================================================================================================
    PASSPORT CONFIGURATION
================================================================================================
*/

app.use(require("express-session") ({
    secret : "This is a secret page",
    resave : false,
    saveUninitialized : false
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
passport.use(new LocalStrategy(Candidate.authenticate()));

passport.serializeUser(Candidate.serializeUser());
passport.deserializeUser(Candidate.deserializeUser());

//MIDDLEWARE TO CHECK IF USER IS LOGGED IN

app.use(function(req, res, next) {
    res.locals.currentUser = req.user;  //THIS IS AVAILABLE TO ALL THE TEMPLATES
    res.locals.error       = req.flash("error");
    res.locals.success     = req.flash("success");
    next();                             //EXECUTE NEXT CODE
});

app.get("/", function(req, res) {
    if(req.user) { // IF ALREADY LOGGED IN
      	if(req.user.isAdmin) {
        	res.redirect("/company"); // IF USER IS ADMIN
      	} else {
        	res.redirect("/" + req.user.username + "/studentlanding"); // IF NOT ADMIN
      	}
    } else {
      	res.render("landing");
    }
});

app.get("/company", middleware.checkIsCompany, function(req, res){
    res.render("companyLanding.ejs");
});

app.get("/companyLanding", middleware.checkIsCompany, function(req, res){
    res.render("companyLanding.ejs");
});

/*
=========================================================================================
      TEST ROUTES
=========================================================================================
*/

app.get("/createtest", middleware.checkIsCompany, function(req, res) {
    res.render("createtest");
});

app.post("/createtest", function(req, res) {
    const name = req.body.name;

    let duration = req.body.duration;
    let date = req.body.date;
    let time = req.body.time;

    date = date + "T" + time + ":00Z";

    const item = new Test( {
        name: name,
        duration:duration,
        date:date
    });

    item.save();

    res.render("testadded");
});

app.get("/selecttest", middleware.checkIsCompany, function(req, res) {
    Test.find({}, function(err, foundTests) {
        if(err) {
            res.redirect("/createtest");
        } else {
            if(foundTests ==0){
                res.render("notest");
            } else {
                res.render("selecttest", {foundTests : foundTests});
            }
        }
    });
});

app.post("/selecttest", function(req, res) {
    const test = req.body.name;

    res.redirect("/" + test + "/managetest");
});

app.get("/:id/managetest", function(req, res) {

    const test = req.params.id;

    res.render("managetest", {test: test});
});

app.post("/managetest", function(req, res) {
    const type = req.body.type;
    const test = req.body.test;

    if(type === "mcq") {
        const ques = req.body.question;
        const opt1 = req.body.option1;
        const opt2 = req.body.option2;
        const opt3 = req.body.option3;
        const opt4 = req.body.option4;
        const ans  = req.body.answer;

        const item = new Question({
            question: ques,
            option1: opt1,
            option2: opt2,
            option3: opt3,
            option4: opt4,
            answer: ans,
            test: req.body.test
        });

        item.save();
    } else {
        const ques = req.body.ques;
        const input = req.body.input;
        const output = req.body.output;
        const constraints = req.body.constraints;
        const sample = req.body.sample;

        const item = new Codingproblem({
            question: ques,
            input: input,
            output: output,
            constraints: constraints,
            sample: sample,
            test: test
        });

        item.save();
    }
    res.render("addedsuccessfully",{testname : test});
});

app.get("/sharetestlink", middleware.checkIsCompany, function(req, res) {
  	var sendtest = [];
  	var todaydate = Date.parse((new Date()).toISOString()) + 19800000;

  	var date_diff_indays = function(date1, date2) { //Function to return seconds difference between current date and exam date
		dt1 = new Date(date1);
     	dt2 = new Date(date2);
     	return ((Date.UTC(dt2.getFullYear(), dt2.getMonth(), dt2.getDate(),dt2.getHours(),dt2.getMinutes(),dt2.getSeconds()) - Date.UTC(dt1.getFullYear(), dt1.getMonth(), dt1.getDate(),dt1.getHours(),dt1.getMinutes(),dt1.getSeconds()) ) /(1000));
  	}

  	Test.find({},function(err, foundtest) {
   		if(err) {
     		console.log(err);
   		} else {
     		for(var i = 0; i < foundtest.length; i++) {
        		var timediff  = date_diff_indays(todaydate,Date.parse(foundtest[i].date.toISOString()));
        		var dur = foundtest[i].duration;
        		dur = dur*60;

        		if(timediff + dur > 0) {
          			sendtest.push(foundtest[i]);
        		}
     		}
    	}

    	res.render("sharewhichtest",{tests:sendtest});
  	});
});

app.get("/:testid/sharetestlink", middleware.checkIsCompany, function(req, res) {
    res.render("sharetestlink", {testid : req.params.testid});
});

app.post("/:testid/sharetestlink", function(req, res) {
    var nodemailer = require('nodemailer');
    var cron = require('node-cron');
    var schedule = require('node-schedule');
    var year = parseInt(req.body.year);
    var month = parseInt(req.body.month) - 1;
    var day = parseInt(req.body.day);
    var hour = parseInt(req.body.hour);
    var minute = parseInt(req.body.minute);
    var second = parseInt(req.body.second);

    var date = Date.parse(new Date(year,month, day, hour, minute, second));

    date = new Date(date);

    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: '',
          pass: ''
        }
      });

    var idlist=[];

    Test.findOne({_id:req.params.testid}, function(err, testsendmail) {
        if(err) {
          	console.log(err);
        } else {
          	for(var v = 0; v < testsendmail.candidates.length; v++){
              	idlist.push(testsendmail.candidates[v]);
          	}	

          	var maillist=[];

          	Candidate.find({'_id': { $in : idlist}}, function(err, docs) {
               	for(var i = 0;i < docs.length; i++){
                 	maillist.push(docs[i].username);
               	}

               	var mailOptions = {
                 	from: '',
                 	to : maillist,
                 	subject: 'Please refer to the below link',
                 	text: 'https://plusone.ganeshkasar.live/'
               	};

              	var j = schedule.scheduleJob(date, function() {
                	console.log('The world is going to end today.');
                 	transporter.sendMail(mailOptions, function (error, info) {
                     	if (error) {
                         	console.log(error);
                     	} else {
                         	console.log('Email sent: ' + info.response);
                     	}
                   	});
               	});
          	});
        }
    });
    
	res.render("sendmailsuccedfully");
});


app.get("/signup", function(req, res) {
    res.render("signup");
});

app.get("/login", function(req, res) {
    res.render("login");
});

app.get("/:id/test", function(req, res) {

    const test = new Test({
      name : req.params.id
    });

    const id = test.name;

    Question.find({test : test.name}, function(err, foundQuestions) {
        if(err) {
            console.log("Error occured while fetching data from database!");
            res.redirect("/createtest");
        } else {

            Codingproblem.find({test : test.name}, function(err, foundCodingPbs) {
                if(err) {
                    console.log("Error occured while fetching data from database!");
                    res.redirect("/createtest");
                } else {
                    Test.find({_id:id},function(err,foundD) {
                      	if(err) {
                        	console.log(err);
                      	} else {
                        	var date = foundD[0].date;
                        	var duration = foundD[0].duration;

                        	duration = duration*60;

                        	var myQuestions = [];

							for(var f = 0; f < foundQuestions.length; f++) {
								var question = foundQuestions[f].question;
								var a= foundQuestions[f].option1;
								var b= foundQuestions[f].option2;
								var c= foundQuestions[f].option3;
								var d= foundQuestions[f].option4;
								var correctAnswer= foundQuestions[f].answer;
								var ob = {
									question:question,
									answers: {
										a : a,
										b : b,
										c : c,
										d : d
									},
									correctAnswer: correctAnswer
								};

                          		myQuestions.push(ob);
                      		}
                        	
							  res.render("oldtest", {foundQuestions : myQuestions, date : date, duration : duration, foundCodingProblems : foundCodingPbs});
                        }
                    });
                }
            });
        }
    });
});

app.post("/test", function(req, res) {
    res.render("worksfine");
});

app.get("/viewtest", middleware.checkIsCompany, function(req, res){
  	Test.find({}, function(err, foundTests) {
    	if(err) {
          	res.redirect("/createtest");
      	} else {
        	if(foundTests == 0){
          		res.render("notest");
        	} else {
        		res.render("selectviewtest", {foundTests : foundTests});
        	}
      	}
  	});
});

app.get("/:id/viewtest", function(req, res){ //Test can only be viewed if the test is at that time

  	const test = new Test({
		name:req.params.id
  	});

  	const id = test.name;
  	var dateExam;
  	var duration;

  	let one =9;

  	Test.find({_id : id},function(err, dateFound) {
    	if(err) {
      		console.log("Error from test db about date");
      		console.log(err);
    	} else {
       		var date_diff_indays = function(date1,date2) { //Function to return seconds difference between current date and exam date
          		dt1 = new Date(date1);
          		dt2 = new Date(date2);
          		return ((Date.UTC(dt2.getFullYear(), dt2.getMonth(), dt2.getDate(),dt2.getHours(),dt2.getMinutes(),dt2.getSeconds()) - Date.UTC(dt1.getFullYear(), dt1.getMonth(), dt1.getDate(),dt1.getHours(),dt1.getMinutes(),dt1.getSeconds()) ) /(1000));
       		}

       		dateExam = dateFound[0].date;
       		dateExam.setMinutes(dateExam.getMinutes() - 330);

       		var curDate = new Date();

       		curDate = curDate.toISOString();
       		dateExam = dateExam.toISOString();

       		var timeDiff  = date_diff_indays(dateExam,curDate);

       		duration = dateFound[0].duration;
       		duration = duration * 60;

       		if(duration >= timeDiff && timeDiff >= 0) {
				Question.find({test : id}, function(err, foundQuestions) {
           			if(err) {
               			console.log("Error occured while fetching data from database!");
               			console.log(err);
               			res.redirect("/createtest");
           			} else {
               			let sendDate = Date.parse(dateExam); //sending in milliseconds (Time passed since I think 1970)

               			Codingproblem.find({test : test.name}, function(err, foundCodingPbs) {
							if(err) {
                    			console.log("Error occured while fetching data from database!");
                    			res.redirect("/createtest");
                			} else {
                    			Test.find({_id : id}, function(err,foundD) {
									if(err) {
                        				console.log(err);
                      				} else {
                        				var date = foundD[0].date;
                        				var duration = foundD[0].duration;
                        				duration = duration * 60;
                        				var myQuestions = [];
                        				
										for(var f = 0; f < foundQuestions.length; f++) {
                            				var question = foundQuestions[f].question;
                            				var a = foundQuestions[f].option1;
                            				var b = foundQuestions[f].option2;
                            				var c = foundQuestions[f].option3;
                            				var d = foundQuestions[f].option4;
                            				var correctAnswer = foundQuestions[f].answer;
                            				var ob = {
                            					question : question,
                            					answers : {
                              						a : a,
                             	 					b : b,
                              						c : c,
                              						d : d
                            					},
                            					correctAnswer: correctAnswer
                          					};
                          				
											myQuestions.push(ob);
                      					}

                      					res.render("oldtest", {testid:req.params.id,foundQuestions : myQuestions, date : date, duration : duration, foundCodingProblems : foundCodingPbs});
                        			}
                    			});
                			}
            			});
           			}
       			});
       		} else {
        		var availDateObject = new Date(Date.parse(dateExam));
        		res.render("testCurrentlyNot",{availableAt:availDateObject});
       		}
    	}
  	});
});

app.get("/:stuid/:id/viewtest", function(req, res){       //To prevent user from going back
    res.render("starttest", {stuid : req.params.stuid, id : req.params.id});
});

app.get("/:true/:stuid/:id/viewtest", function(req, res) {
    const test = new Test({
        name:req.params.id
    });

    const id = test.name;
    var dateExam;
    var duration;
    let one = 9;

    Candidate.findOne({username : req.params.stuid}, function(err, stude){
        for(let i = 0; i < stude.submitted.length; i++) {
          	if(stude.submitted[i].toString() == req.params.id.toString()) {
            	if(stude.yesorno[i] === true) {
                	res.render("testalreadysubmitted", {testid : req.params.id, stuid : req.params.stuid});
              	}
          	}
        }
    });

    Test.find({_id : id}, function(err, dateFound) {
        if(err) {
        	console.log("Error from test db about date");
          	console.log(err);
        } else {
           	var date_diff_indays = function(date1, date2) { //Function to return seconds difference between current date and exam date
              	dt1 = new Date(date1);
              	dt2 = new Date(date2);
              	return ((Date.UTC(dt2.getFullYear(), dt2.getMonth(), dt2.getDate(), dt2.getHours(), dt2.getMinutes(), dt2.getSeconds()) - Date.UTC(dt1.getFullYear(), dt1.getMonth(), dt1.getDate(), dt1.getHours(), dt1.getMinutes(), dt1.getSeconds())) /(1000));
           	}

           	dateExam = dateFound[0].date;
           	dateExam.setMinutes(dateExam.getMinutes() - 330);

           	var curDate = new Date();

           	curDate = curDate.toISOString();
           	dateExam = dateExam.toISOString();

           	var timeDiff  = date_diff_indays(dateExam, curDate);

           	duration = dateFound[0].duration;
           	duration = duration * 60;

           	if(duration >= timeDiff && timeDiff >= 0) {

            	Question.find({test : id}, function(err, foundQuestions) {
               		if(err) {
                   		console.log("Error occured while fetching data from database!");
                   		console.log(err);
                   		res.redirect("/createtest");
               		} else {
                   		let sendDate = Date.parse(dateExam); //sending in milliseconds (Time passed since I think 1970)

                   		Codingproblem.find({test : test.name}, function(err, foundCodingPbs) {
                    		if(err) {
                        		console.log("Error occured while fetching data from database!");
                        		res.redirect("/createtest");
                    		} else {
                        		Test.find({_id : id}, function(err, foundD) {
                          			if(err) {
                            			console.log(err);
                          			} else {
                            			String.prototype.replaceAt = function(index, replacement) {
                                			return this.substr(0, index) + replacement + this.substr(index + replacement.length);
                            			}

										var date = foundD[0].date;
                            			var duration = foundD[0].duration;

										duration = duration * 60;

										var myQuestions = [];

										for(var f = 0; f < foundQuestions.length; f++) {
                                			var question = foundQuestions[f].question;
                                			var a = foundQuestions[f].option1;
                                			var b = foundQuestions[f].option2;
                                			var c = foundQuestions[f].option3;
                                			var d= foundQuestions[f].option4;
                                			var correctAnswer = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin lacus velit, scelerisque ut vehicula ac, dictum eu nulla. Suspendisse id nunc congue, vestibulum dui rutrum, tincidunt mauris. Integer non tortor efficitur, pharetra nisl sed, sagittis ex. Quisque viverra nunc eget massa pellentesque efficitur. Interdum et malesuada fames ac ante ipsum primis in faucibus. Aliquam erat volutpat. Cras ullamcorper vehicula dolor, nec cursus nisi. Sed dapibus, nisl a consectetur vestibulum, neque augue aliquam orci, sit amet posuere dolor mauris et dui. Suspendisse et leo id orci facilisis auctor vitae nec arcu. Aenean porta leo nec felis posuere, varius tempor augue viverra. Sed tristique pretium elit, in lacinia lacus rhoncus porta. In gravida ultricies leo, id aliquam elit ultricies vitae. Morbi in lobortis neque, eget malesuada mi. Donec pellentesque semper pulvinarLorem ipsum dolor sit amet, consectetur adipiscing elit. Proin lacus velit, scelerisque ut vehicula ac, dictum eu nulla. Suspendisse id nunc congue, vestibulum dui rutrum, tincidunt mauris. Integer non tortor efficitur, pharetra nisl sed, sagittis ex. Quisque viverra nunc eget massa pellentesque efficitur. Interdum et malesuada fames ac ante ipsum primis in faucibus. Aliquam erat volutpat. Cras ullamcorper vehicula dolor, nec cursus nisi. Sed dapibus, nisl a consectetur vestibulum, neque augue aliquam orci, sit amet posuere dolor mauris et dui. Suspendisse et leo id orci facilisis auctor vitae nec arcu. Aenean porta leo nec felis posuere, varius tempor augue viverra. Sed tristique pretium elit, in lacinia lacus rhoncus porta. In gravida ultricies leo, id aliquam elit ultricies vitae. Morbi in lobortis neque, eget malesuada mi. Donec pellentesque semper pulvinarLorem ipsum dolor sit amet, consectetur adipiscing elit. Proin lacus velit, scelerisque ut vehicula ac, dictum eu nulla. Suspendisse id nunc congue, vestibulum dui rutrum, tincidunt mauris. Integer non tortor efficitur, pharetra nisl sed, sagittis ex. Quisque viverra nunc eget massa pellentesque efficitur. Interdum et malesuada fames ac ante ipsum primis in faucibus. Aliquam erat volutpat. Cras ullamcorper vehicula dolor, nec cursus nisi. Sed dapibus, nisl a consectetur vestibulum, neque augue aliquam orci, sit amet posuere dolor mauris et dui. Suspendisse et leo id orci facilisis auctor vitae nec arcu. Aenean porta leo nec felis posuere, varius tempor augue viverra. Sed tristique pretium elit, in lacinia lacus rhoncus porta. In gravida ultricies leo, id aliquam elit ultricies vitae. Morbi in lobortis neque, eget malesuada mi. Donec pellentesque semper pulvinarLorem ipsum dolor sit amet, consectetur adipiscing elit. Proin lacus velit, scelerisque ut vehicula ac, dictum eu nulla. Suspendisse id nunc congue, vestibulum dui rutrum, tincidunt mauris. Integer non tortor efficitur, pharetra nisl sed, sagittis ex. Quisque viverra nunc eget massa pellentesque efficitur. Interdum et malesuada fames ac ante ipsum primis in faucibus. Aliquam erat volutpat. Cras ullamcorper vehicula dolor, nec cursus nisi. Sed dapibus, nisl a consectetur vestibulum, neque augue aliquam orci, sit amet posuere dolor mauris et dui. Suspendisse et leo id orci facilisis auctor vitae nec arcu. Aenean porta leo nec felis posuere, varius tempor augue viverra. Sed tristique pretium elit, in lacinia lacus rhoncus porta. In gravida ultricies leo, id aliquam elit ultricies vitae. Morbi in lobortis neque, eget malesuada mi. Donec pellentesque semper pulvinarLorem ipsum dolor sit amet, consectetur adipiscing elit. Proin lacus velit, scelerisque ut vehicula ac, dictum eu nulla. Suspendisse id nunc congue, vestibulum dui rutrum, tincidunt mauris. Integer non tortor efficitur, pharetra nisl sed, sagittis ex. Quisque viverra nunc eget massa pellentesque efficitur. Interdum et malesuada fames ac ante ipsum primis in faucibus. Aliquam erat volutpat. Cras ullamcorper vehicula dolor, nec cursus nisi. Sed dapibus, nisl a consectetur vestibulum, neque augue aliquam orci, sit amet posuere dolor mauris et dui. Suspendisse et leo id orci facilisis auctor vitae nec arcu. Aenean porta leo nec felis posuere, varius tempor augue viverra. Sed tristique pretium elit, in lacinia lacus rhoncus porta. In gravida ultricies leo, id aliquam elit ultricies vitae. Morbi in lobortis neque, eget malesuada mi. Donec pellentesque semper pulvinar";
                                			correctAnswer = correctAnswer.replaceAt(1953, (foundQuestions[f].answer));

                                			var ob = {
                                				question : question,
                            					answers: {
                                  					a : a,
                                  					b : b,
                                  					c : c,
                                  					d : d
                                				},
                                				correctAnswer : correctAnswer
                              				};

											myQuestions.push(ob);
                          				}

                          				res.render("test", {testid : req.params.id, foundQuestions : myQuestions, date : date, duration : duration, foundCodingProblems : foundCodingPbs, stuid : req.params.stuid});
                            		}
                        		});
                    		}
                		});
               		}
           		});
           	} else {
            	var availDateObject = new Date(Date.parse(dateExam));
            	res.render("testCurrentlyNotstudent", {availableAt : availDateObject, stuid : req.params.stuid});
           	}
        }
    });
});

//student result
app.post("/:testid/:stuid/studentresult",function(req,res){
  var marks = req.body.resultss;

  if(req.body.resultss ==  "")
    marks = 0;
  
	Candidate.updateOne(
    	{username : req.params.stuid},
    	{$push : {result : marks}},
    	
		function(err, result) {
      		if (err) {
        		console.log(err);
      		}
    	}
  	);
 	
	Candidate.updateOne(
    	{username : req.params.stuid},
    	{$push : {submitted : req.params.testid}},
    	
		function(err, res) {
      		if(err) {
        		console.log(err);
      		}
    	}
  	);
  	
	Candidate.updateOne(
    	{username : req.params.stuid},
    	{$push: {yesorno : true}},
    	
		function(err, result) {
      		if (err) {
        		console.log(err);
      		}
    	}
  	);
  	
	res.render("studentresult", {result : req.params.stuid.result, stuid : req.params.stuid});
});

//AUTH ROUTES//

//Show register form

app.get("/studentRegister", function(req, res){
    res.render("studentRegister.ejs");
});

//Handle signup logic
app.post("/studentRegister", function(req, res) {
    var newCandidate = new Candidate({name : req.body.candidate_name, username : req.body.username, Institute : req.body.institute, LinkedIn : req.body.linkedin, prn : req.body.prn})

    if(req.body.username === 'iamadmin@gmail.com' && req.body.password === 'admin123'){
        newCandidate.isAdmin = true;
    }

    Candidate.register(newCandidate, req.body.password, function(err, user) {
        if(err) {
            console.log(err);
            return res.render("studentRegister", {error: err.message});
        }

        passport.authenticate("local") (req, res, function() {
            req.flash("success", "Welcome " + newCandidate.name + "!");
            if(req.body.username === 'iamadmin@gmail.com' && req.body.password === 'admin123') {
                res.redirect("/companyLanding");   //admin hai toh company page
            } else {
              	var sendtest = [];
              	var todaydate = Date.parse((new Date()).toISOString()) + 19800000;
              	var date_diff_indays = function(date1,date2) { //Function to return seconds difference between current date and exam date
                	dt1 = new Date(date1);
                 	dt2 = new Date(date2);
                 	return ((Date.UTC(dt2.getFullYear(), dt2.getMonth(), dt2.getDate(),dt2.getHours(),dt2.getMinutes(),dt2.getSeconds()) - Date.UTC(dt1.getFullYear(), dt1.getMonth(), dt1.getDate(),dt1.getHours(),dt1.getMinutes(),dt1.getSeconds()) ) /(1000));
              	}

              	Test.find({},function(err,foundtest) {

                	if(err) {
                 		console.log(err);
               		} else {
                 		for(var i = 0; i < foundtest.length; i++) {
                  			var timediff = date_diff_indays(todaydate,Date.parse(foundtest[i].date.toISOString()));
                   			var dur = foundtest[i].duration;
                   			dur = dur*60;

                   			if(timediff + dur > 0) {
                    			sendtest.push(foundtest[i]);
                  			}
                 		}
               		}
               	
					res.render("studentlanding", {sendtest : sendtest, stuid : req.body.username});
            	});
        	}
    	})
    });
});

//Show login form
app.get("/studentLogin", function(req, res){
    res.render("studentLogin");
});

//Handle login logic
//app.post("/studentLogin, middleware, function ")
app.post("/studentLogin", passport.authenticate("local",
    {
        failureRedirect: "/studentLogin",
        failureFlash: true,
        successFlash: 'Welcome back!'
    }), function(req, res) {

        //Logic to check if already logged in somewhere
        
        if(req.body.username === "iamadmin@gmail.com" &&  req.body.password === "admin123") {
            res.render("companyLanding");   //redirect to student landing page
        } else {
          	Candidate.findOne({username : req.body.username}, function(err, stud) {
            	if(stud.isLoggedIn == true) {
                	req.logout();
                	res.redirect("/studentLogin");
            	}
          	});

          	Candidate.updateOne({username : req.body.username}, {$set : {isLoggedIn : true}},function(err) {
            	if(err)
              		console.log(err);
          	});
          	// To show the test on students page
          	var sendtest = [];
          	var todaydate = Date.parse((new Date()).toISOString()) + 19800000;
          	var date_diff_indays = function(date1,date2) { //Function to return seconds difference between current date and exam date
             	dt1 = new Date(date1);
             	dt2 = new Date(date2);
             	return ((Date.UTC(dt2.getFullYear(), dt2.getMonth(), dt2.getDate(),dt2.getHours(),dt2.getMinutes(),dt2.getSeconds()) - Date.UTC(dt1.getFullYear(), dt1.getMonth(), dt1.getDate(),dt1.getHours(),dt1.getMinutes(),dt1.getSeconds()) ) /(1000));
          	}
          	
			Test.find({}, function(err, foundtest) {
           		if(err) {
             		console.log(err);
          	 	} else {
             		Candidate.find({username : req.body.username}, function(err, student) {
               			for(var i = 0; i < foundtest.length; i++) {
                 			var timediff = date_diff_indays(todaydate, Date.parse(foundtest[i].date.toISOString()));
                 			var dur = foundtest[i].duration;
                 			dur = dur*60;
                 			
							if(timediff + dur > 0) {
                  				for(var c = 0; c < foundtest[i].candidates.length; c++) {
                   	 				if((foundtest[i].candidates[c].toString() == student[0]._id.toString())) {
                        				break;
                    				}
                  				}
                  			
								if(c == foundtest[i].candidates.length) {
                    				sendtest.push(foundtest[i]);
                 	 			}
                			}
               			}
              		
						res.render("studentlanding",{sendtest:sendtest,stuid:req.body.username});
             		});
         		}
       		});

		}
	});

//student register for the test
app.get("/:stuid/:testid/registerteststudent", function(req, res) {
  	Candidate.find({username : req.params.stuid}, function(err, student) {
    	if(err) {
      		console.log(err);
    	} else {
        	var s = student[0]._id;
        	Test.updateOne(
          		{_id : req.params.testid},
          		{$push: {candidates : s}},
          		function(err, result) {
            		if (err) {
              			res.send(err);
            		}
          		}
        	);
    	}
  	});

  	var sendtest = [];
  	var todaydate = Date.parse((new Date()).toISOString()) + 19800000;
  	var date_diff_indays = function(date1,date2) { //Function to return seconds difference between current date and exam date
     	dt1 = new Date(date1);
     	dt2 = new Date(date2);
     	return ((Date.UTC(dt2.getFullYear(), dt2.getMonth(), dt2.getDate(),dt2.getHours(),dt2.getMinutes(),dt2.getSeconds()) - Date.UTC(dt1.getFullYear(), dt1.getMonth(), dt1.getDate(),dt1.getHours(),dt1.getMinutes(),dt1.getSeconds()) ) /(1000));
  	}
  	
	Test.find({}, function(err, foundtest) {
   		if(err) {
     		console.log(err);
   	} else {
     	Candidate.find({username : req.params.stuid}, function(err, student) {
       		for(var i = 0; i < foundtest.length; i++) {
         		if(foundtest[i]._id.toString()!=req.params.testid.toString()) {
					var timediff  = date_diff_indays(todaydate,Date.parse(foundtest[i].date.toISOString()));
        			var dur = foundtest[i].duration;
        			dur = dur*60;
        			
					if(timediff + dur > 0) {
          				for(var c = 0; c < foundtest[i].candidates.length; c++) {
            				if((foundtest[i].candidates[c].toString() == student[0]._id.toString())) { 
                				break;
            }
          }
          if(c==foundtest[i].candidates.length){
            sendtest.push(foundtest[i]);
          }
        }}
       }
       //console.log(sendtest);
       res.render("studentlanding",{sendtest:sendtest,stuid:req.params.stuid});
     });
 }
});
});

//studentlanding logic

app.get("/:stuid/studentlanding",function(req,res){
  var sendtest=[];
  var todaydate=Date.parse((new Date()).toISOString())+19800000;
  var date_diff_indays = function(date1,date2) { //Function to return seconds difference between current date and exam date
     dt1 = new Date(date1);
     dt2 = new Date(date2);
     return ((Date.UTC(dt2.getFullYear(), dt2.getMonth(), dt2.getDate(),dt2.getHours(),dt2.getMinutes(),dt2.getSeconds()) - Date.UTC(dt1.getFullYear(), dt1.getMonth(), dt1.getDate(),dt1.getHours(),dt1.getMinutes(),dt1.getSeconds()) ) /(1000));
  }
  Test.find({},function(err,foundtest){
   if(err){
     console.log(err);
   }
   else{
     Candidate.find({username:req.params.stuid},function(err,student){
       for(var i=0;i<  foundtest.length ;i++){
         var timediff  = date_diff_indays(todaydate,Date.parse(foundtest[i].date.toISOString()));
         var dur=foundtest[i].duration;
         dur=dur*60;
         if(timediff+dur >0){
          for(var c=0 ; c< foundtest[i].candidates.length;c++){
            if((foundtest[i].candidates[c].toString() == student[0]._id.toString())){
              //console.log(foundtest[i]);
                break;
            }
          }
          if(c==foundtest[i].candidates.length){
            sendtest.push(foundtest[i]);
          }
        }
       }
       //console.log(sendtest);
       res.render("studentlanding",{sendtest:sendtest,pro:student,stuid:req.params.stuid});

     });
 }
});
});

//student deleteprofile logic

app.post("/:stuid/deleteprofile",function(req,res){
  Candidate.find({username:req.params.stuid},function(err,stu){
    Candidate.findOneAndDelete({username:req.params.stuid},function(errr){
      if(errr){
        console.log(errr);
      }else{
        res.render("studentLogin");
      }
    });
  });
});

//studentprofile logic
app.get("/:stuid/studentprofile",function(req,res){
  Candidate.find({username:req.params.stuid},function(err,stud){
    if(err){
      console.log(err);
    }else{
      res.render("studentprofile", {pro :stud, stuid : req.params.stuid});
    }
  });
});

//studentresult logic
app.get("/:stuid/studentpastresult",function(req,res){
  Candidate.find({username:req.params.stuid},function(err,stud){
    if(err){
      console.log(err);
    }else{
      var resul=[];
      var t=[];
      for(let x=0;x<stud[0].result.length;x++){
        resul.push(stud[0].result[x]);
        t.push(stud[0].submitted[x]);
      }
      var testres=[];
      Test.find({},function(err,te){
        if(err){
          console.log(err);
        }else{
          for(let j=0;j<t.length;j++){
          {for(i=0;i<te.length;i++)
          if(te[i]._id.toString()== t[j].toString()){
            testres.push(te[i].name);
          }}
        }
      }
      res.render("studentpastresult",{testres:testres,pro:resul,stuid:req.params.stuid});
      });
    }
  });
})

//futuretest logic
app.get("/:stuid/upcomingtest",function(req,res){
  Candidate.findOne({username:req.params.stuid},function(err,stud){
    if(err){
      console.log(err);
    }else{
      var testsend=[];
      Test.find({},function(err,tesst){
        if(err){
          console.log(err);
        }
        else{
          var todaydate=Date.parse((new Date()).toISOString())+19800000;
          var date_diff_indays = function(date1,date2) { //Function to return seconds difference between current date and exam date
             dt1 = new Date(date1);
             dt2 = new Date(date2);
             return ((Date.UTC(dt2.getFullYear(), dt2.getMonth(), dt2.getDate(),dt2.getHours(),dt2.getMinutes(),dt2.getSeconds()) - Date.UTC(dt1.getFullYear(), dt1.getMonth(), dt1.getDate(),dt1.getHours(),dt1.getMinutes(),dt1.getSeconds()) ) /(1000));
          }
          for(var c=0;c<tesst.length;c++){
            for(var d=0;d<tesst[c].candidates.length;d++){
              if(tesst[c].candidates[d].toString()==stud._id.toString()){
                var obj=[];
                var timediff  = date_diff_indays(todaydate,Date.parse(tesst[c].date.toISOString()));
                var dur=tesst[c].duration;
                dur=dur*60;
                // console.log(tesst[c].name);
                // console.log(timediff);
                // console.log(new Date (todaydate));
                // console.log(tesst[c].date);
                if(timediff + dur>0){
                  obj.push(tesst[c].name);
                  obj.push(tesst[c].date.toISOString());
                  obj.push(tesst[c].duration);
                  obj.push(tesst[c]._id);
                  testsend.push(obj);
                  break;
                }
              }
            }
          }
          res.render("upcomingtest",{pro:testsend,stuid:req.params.stuid});
        }
      });
    }
  });
});

// Viewing test results for the admin
app.get(("/viewresults"), middleware.checkIsCompany,function(req,res){
  Test.find({},function(err,happenedtest){
    if(err){
      console.log(err);
    }else{
      //  console.log(happenedtest[0]);
        var newarr=[];
        for(var i=0;i<happenedtest.length;i++){
          var obj = [];
          obj.push(happenedtest[i].candidates);
          obj.push(happenedtest[i]._id);
          obj.push(happenedtest[i].name);
          newarr.push(obj);
        }
        res.render("viewresults",{test:newarr});
    }
  });
});

app.get(("/viewcandidates"), middleware.checkIsCompany, function(req, res){
  Candidate.find({}, function(err, candidates) {
    if(err) {
      console.log(err);
    } else {
      res.render("viewcandidates", {candidates : candidates});
    }
  })
});

app.get(("/updatecandidate/:stuid"), function(req, res) {
  Candidate.updateOne({username : req.params.stuid}, {$set: {isLoggedIn : false}}, function(err) {
      if(err) {
        console.log(err);
      } else {
        res.redirect("/viewcandidates");
      }
  })
  res.redirect("/company");
});

//Viewing test results for the admin of particular test
app.get(("/:testid/results"), function(req, res){
  Test.findOne({_id : req.params.testid},function(err,foundt){
    var resul=[];
    Candidate.find({'_id': { $in : foundt.candidates}},function(err,stdlist){
      for(var t=0;t<stdlist.length;t++){
        var temp=[];
        var iddd=req.params.testid;
        temp.push(stdlist[t].name);
        temp.push(stdlist[t].username);
        for(var f=0;f<stdlist[t].submitted.length;f++){
          if(stdlist[t].submitted[f].toString()== iddd.toString()){
              temp.push(stdlist[t].result[f]);
            break;
          }
        }
        if(f==stdlist[t].submitted.length)
          temp.push(0);
        temp.push(stdlist[t].prn);
        resul.push(temp);
      }
      res.render("showresult",{result:resul,testid:req.params.testid,testname:foundt.name});
    });
    // for(var t=0;t<foundt.candidates.length;t++){
    //   console.log("d");
    //   console.log(t);
    //   Candidate.findOne({_id:foundt.candidates[t]},function(err,std){
    //       if(t == foundt.candidates.length){ // removed && resul.length == t
    //         console.log("ss");
    //         res.render("showresult",{result:resul,testid:req.params.testid,testname:foundt.name});
    //       }
    //   });
    // }
  });
});

//Logout logic
app.get("/:stuid/studentLogout", function(req, res) { // for students
    Candidate.updateOne({username: req.params.stuid}, {$set: {isLoggedIn: false}}, function(err) {
      console.log(err);
    });
    //req.body.isLoggedIn = false;
    req.logout();
    req.flash("success", "Logged out successfully!");
    res.redirect("/");
})
app.get("/studentLogout", function(req, res) {    //for company
  req.body.isLoggedIn = false;
    req.logout();
    req.flash("success", "Logged out successfully!");
    res.redirect("/");
})

//Comment, Do not erase
app.listen(process.env.PORT||3000, function(){
    console.log("SERVER HAS STARTED!");
});


//Comment, Do not erase

// app.listen(process.env.PORT, process.env.IP, function(){
//     console.log("SERVER HAS STARTED!");
// });
