// collections are considered changed if the member set count changes or
// one of the member sets is updated

// flickr.collections.getTree to count member sets

// sets are considered changed if their photo count changes or one of the
// photos shows changed

// flickr.photosets.getInfo gets photo count and update date

// flickr.photos.getInfo gets update date

/*
"into the maw"
photo:
"dates": { "posted": "1511224886", "taken": "2017-10-15 16:00:12", "takengranularity": 0, "takenunknown": 0, "lastupdate": "1517718861" },

set:
{ "photoset": { "id": "72157688725486731", "owner": "60950751@N04", "username": "Trail Image", "primary": "38552126701",
 "secret": "d3cf728e7c", "server": "4562", "farm": 5, "photos": 28, "count_views": 0, "count_comments": 0, "count_photos": 28, "count_videos": 0,
    "title": { "_content": "Owyhee Powder" },
    "description": { "_content": "Apparently making up for lost time now, my neighbor Tony sends out word of another autumn ride,
     this time to the south. I RSVP in the positive once I’ve secured permission from the boss." },
      "can_comment": 1, "date_create": "1511224535", "date_update": "1511225009" }, "stat": "ok" }


AFTER CHANGE

photo: CHANGED
"dates": { "posted": "1511224886", "taken": "2017-10-15 16:00:12", "takengranularity": 0, "takenunknown": 0, "lastupdate": "1521989908" },
    "permissions": { "permcomment": 3, "permaddmeta": 2 }, "views": "101",

set: NOT CHANGED
{ "photoset": { "id": "72157688725486731", "owner": "60950751@N04", "username": "Trail Image", "primary": "38552126701", "secret": "d3cf728e7c", "server": "4562", "farm": 5, "photos": 28, "count_views": 0, "count_comments": 0, "count_photos": 28, "count_videos": 0,
    "title": { "_content": "Owyhee Powder" },
    "description": { "_content": "Apparently making up for lost time now, my neighbor Tony sends out word of another autumn ride, this time to the south. I RSVP in the positive once I’ve secured permission from the boss." },
     "can_comment": 1, "date_create": "1511224535", "date_update": "1511225009" }, "stat": "ok" }

*/
