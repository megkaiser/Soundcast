// Initialize Firebase
var config = {
  apiKey: "AIzaSyBNrMAXF5NX4lwRpr4XKPqpja-1PG0xaTM",
  authDomain: "soundcast-a7e68.firebaseapp.com",
  databaseURL: "https://soundcast-a7e68.firebaseio.com",
  projectId: "soundcast-a7e68",
  storageBucket: "soundcast-a7e68.appspot.com",
  messagingSenderId: "164674645896"
};
firebase.initializeApp(config);

// Initialize variables
var weatherCode;
var index = 0;
var mixURLs = [];
var date1;
var date2;
var widget = Mixcloud.PlayerWidget(document.getElementById('my-widget-iframe'));
var db = firebase.database();


//Open Weather Map API Key

var WeatherAPIKey = "52868524724c9712b16e9c2c6e0587e5";
var GeolocationAPIKey = "AIzaSyA5W3-HXFqPGO2zu2ZqS54zEl6YOkwQFtM";

//Function to run Google Geolocation API
function getGeoLocationGoogle() {
	var googleQueryURL = "https://www.googleapis.com/geolocation/v1/geolocate?key=" + GeolocationAPIKey;
    return new Promise(function(resolve, reject) {
        $.ajax({
        	method: "POST",
            url: googleQueryURL,
        }).done(function(response) {
            resolve(response);
        }).fail(function(err) {
            reject(err);
        })
    })
}


//Function to run Weather API with Geolocation
function getWeatherWithGeo() {
  return new Promise(function(resolve,reject) {
    getGeoLocationGoogle()
      .then(function(response) {
          var lat = response.location.lat;
          var lon = response.location.lng;

          var weatherLLQueryURL = "http://api.openweathermap.org/data/2.5/weather?lat=" + lat + "&lon=" + lon + "&appid=" + WeatherAPIKey;
          $.ajax({
              url: weatherLLQueryURL,
              method: "GET"
          }).done(function(response) {
              $(".city").html("<h1>" + response.name + " Weather Details</h1>");
              $(".wind").html("Wind Speed: " + response.wind.speed);
              $(".humidity").html("Humidity: " + response.main.humidity);
              var f_temp = 9/5*(response.main.temp-273)+32;
              $(".temp").html("Temperature (F) " + Math.floor(f_temp));
              resolve(response.weather[0].id);
          });
        })
      })

	}

//Function to run Weather API with User Input
function getWeatherWithUserInput() {
	return new Promise(function(resolve, reject) {

	var location = $("#location").val().trim();

	var weatherCSQueryURL = "http://api.openweathermap.org/data/2.5/weather?q=" + location + "=&appid=" + WeatherAPIKey;


	$.ajax({
		url: weatherCSQueryURL,
		method: "GET"
	}).done(function(response) {
			$(".city").html("<h1>" + response.name + " Weather Details</h1>");
			$(".wind").html("Wind Speed: " + response.wind.speed);
			$(".humidity").html("Humidity: " + response.main.humidity);
			var f_temp = 9/5*(response.main.temp-273)+32;
			$(".temp").html("Temperature (F) " + Math.floor(f_temp));
			resolve(response.weather[0].id);
	});

});
};

$("#input-location").click(function(event) {
  event.preventDefault();
  getWeatherWithUserInput()
	.then(function(response) {
		showWidget(response, index);
	})
});

$('#get-location').click(function(event) {
  event.preventDefault();

  getWeatherWithGeo()
  .then(function(response) {
    showWidget(response, index)
  })

})

$('#sign-up').click(function() {
  $("#signup-modal").modal("show");
})

$('#log-in').click(function() {
  $('#login-modal').modal("show");
})

// New Firebase portion

//New User Data
$("#submit-new-user").on("click", function(event) {

  event.preventDefault();

  var email = $("#signup-email").val().trim();
  var pw = $("#signup-password").val().trim();
  console.log(email, pw);

	firebase.auth().createUserWithEmailAndPassword(email, pw)
  .then(function(user) {
	writeUserData(user.email, user.uid);
  $("#signup-modal").modal("hide");
	})
  .catch(function(error) {
    if (error.code == 'auth/wrong-password') {
      $('#signup-error-msg').html('Invalid password. Please try again.')
    } else if (error.code == 'auth/invalid-email') {
      $('#signup-error-msg').html('Invalid email format. Please try again.')
    } else if (error.code == 'auth/weak-password') {
      $('#signup-error-msg').html(error.message + '. Please try again.')
    } else {
      console.log(error.code, error.message);
      $('#signup-error-msg').html('Unknown error. Please try again.')
    }
  });


});

$("#login-user").on("click", function(event) {

  event.preventDefault();

  var email = $("#login-email").val();
  var pw = $("#login-password").val().trim();

  date1 = getTimes();

	firebase.auth().signInWithEmailAndPassword(email, pw)
  .then(function(user) {
		var userId = firebase.auth().currentUser.uid;
    $('#username').html('Hello! ' + userId);
    $('#login-modal').modal("hide");
	})
  .catch(function(error) {
    if (error.code == 'auth/wrong-password') {
      $('#login-error-msg').html('Invalid password. Please try again.')
    } else if (error.code == 'auth/invalid-email') {
      $('#login-error-msg').html('Invalid email format. Please try again.')
    } else {
      $('#login-error-msg').html('Unknown error. Please try again.')
    }
  });

});

$("#log-out").click(function() {

	var mixURL = $('#my-widget-iframe').attr('data-url');

  if (mixURL) {
    date2 = getTimes();
  	var duration = getDuration(date1, date2);
    var userId = firebase.auth().currentUser.uid;
    db.ref('/users/' + userId).once("value").then(function(snapshot) {
      var snapObj = snapshot.val()
      db.ref('users/' + userId).update({
        lastSession: date2,
        duration: duration,
  			mixURL : mixURL
        })
  	});

  	widget.getPosition().then(function(position) {
  		db.ref('users/' + userId).update({
  			mixPosition : position
  		});
  	});
  }

	firebase.auth().signOut().then(function() {
		$('#username').empty();
	});
});


firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    // User is signed in.
    var userId = firebase.auth().currentUser.uid;
    $('#username').html('Hello!' + userId);
    date1 = getTimes();
  } else {
    // No user is signed in.
    $('#username').empty();
  }
});


function skipToPrevPos() {

  return new Promise(function(resolve, reject) {

    var userId = firebase.auth().currentUser.uid;
    db.ref('/users/' + userId).once("value")
    .then(function(snapshot) {
      var snapObj = snapshot.val();
      var prevURL = snapObj.mixURL;
      var prevPos = snapObj.mixPosition;

      if (prevURL != null) {
        $('iframe').attr('data-URL', prevURL);
        $('iframe').attr('src', 'https://www.mixcloud.com/widget/iframe/?feed=' + prevURL + '&hide_cover=1&mini=1&light=1&autoplay=1');
        //TODO I know this is bad, but I do intend on fixing this later
        setTimeout(function() {
          widget.seek(prevPos);
        },1500)
      }
    });
  });
}

//
//   });
//
// };




function writeUserData(email, userId) {
  firebase.database().ref('users/' + userId).set({
    email: email,
    lastSession: 0,
    duration: 0,
    mixURL: 0,
    mixPosition: 0
    });
}

//Function to collect timestamp and get current position of playlist
function getTimes() {
	var dt = new Date();
	var time = dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds();
	return dt
}

function getDuration(date1, date2) {
	var difference = date2.getTime() - date1.getTime();

       var daysDifference = Math.floor(difference/1000/60/60/24);
       difference -= daysDifference*1000*60*60*24

      var hoursDifference = Math.floor(difference/1000/60/60);
       difference -= hoursDifference*1000*60*60

       var minutesDifference = Math.floor(difference/1000/60);
       difference -= minutesDifference*1000*60

       var secondsDifference = Math.floor(difference/1000);


    return(daysDifference + ' days ' + hoursDifference + ' hours ' + minutesDifference + ' minutes ' + secondsDifference + ' seconds ');
}

// music API //

// Saving these functions for future use but user doesn't need their own unique access token
function getOauth() {
	location.href ="https://www.mixcloud.com/oauth/authorize?client_id=yf52JKSHVGHYVksWSM&redirect_uri=http://localhost:3000";
}

function getAccessToken() {
	location.href='https://www.mixcloud.com/oauth/access_token?client_id=yf52JKSHVGHYVksWSM&redirect_uri=http://localhost:3000&client_secret=KUduqYkAPWqCykfcmQsZYTfk3pR4q89x&code=e8ZrjZXXag'
}

$(window).bind('beforeunload', function(){
	return 'aodifj';
});

// Pass in weather condition code and index of the mix we want to play
function showWidget(weather, index) {
	var access_token = 'E3MjPt6NJSQZ22S3pSTwgEvY7wBWeA5M';

	$.ajax({
		url: 'https://api.mixcloud.com/popular/hot/?access_token=' + access_token,
		method: 'GET',
		dataType: 'json'
	}).done(function(response) {

		// Gather music tags for the corresponding weather condition
		var weatherTags = weatherToTag(weather);
		// Eliminate any duplicate URLs in the array
		mixURLs = unique(findMusicTag(response, weatherTags));

		// Display mix
		$('#my-widget-iframe').attr('src', 'https://www.mixcloud.com/widget/iframe/?feed=' + mixURLs[index] + '&hide_cover=1&mini=1&light=1&autoplay=1');
		$('#my-widget-iframe').attr('data-URL', mixURLs[index]);

    var skipBtn = $('<button>');
    skipBtn.addClass('btn btn-default');
    skipBtn.attr('id', 'skip-btn');
    skipBtn.html('Skip')
    $('#skip-display').html(skipBtn);

    var contBtn = $('<button>');
    contBtn.addClass('btn btn-default');
    contBtn.attr('id', 'cont-btn');
    contBtn.html('Continue Listening');
    $('#cont-display').html(contBtn);

    $('#skip-btn').click(function(event) {
      event.preventDefault();
      widget.pause().then(function() {
        skipMix(mixURLs);
      });
    })

    $('#cont-btn').click(function(event) {
      event.preventDefault();
      widget.pause().then(function() {
        skipToPrevPos();
      })
    })
  })

};

// Return music tags for rainy, snowy, and other
function weatherToTag(weatherCode) {
  console.log(weatherCode);
		if (weatherCode >= 200 && weatherCode <= 599) {
      console.log("hello");
			return ['/discover/downtempo/', '/discover/chillout/', '/discover/ambient/'];
		} else if (weatherCode >= 600 && weatherCode <= 622) {
			return ['/discover/jazz/', '/discover/minimal/'];
		} else {
			return ['/discover/beats', '/discover/rap', '/discover/techno/', '/discover/electronica/'];
		}
};

// Go through mixcloud's current popular mixes and find tags that match
function findMusicTag(response, tagsToFind) {
	var data = response.data;

	for (i=0; i<data.length; i++) {
		for (j=0; j<data[i].tags.length; j++) {
			for (k=0; k<tagsToFind.length; k++) {
				if (data[i].tags[j].key == tagsToFind[k]) {
					mixURLs.push(data[i].url)
				}
			}
		}
	}
	return mixURLs;
};

function unique(list) {
  var result = [];
  $.each(list, function(i, e) {
    if ($.inArray(e, result) == -1) result.push(e);
  });
  return result;
};

function skipMix(array) {
	var currentMix = $('iframe').attr('data-URL');
	var newIndex = array.indexOf(currentMix) + 1;
	if (newIndex < array.length) {
		index++;
		showWidget(weatherCode, index);
	} else if (newIndex = array.length) {
		index = 0;
		showWidget(weatherCode, index);
	}

}
