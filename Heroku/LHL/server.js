// Express is the web framework 
var express = require('express');
var pg = require('pg');

var app = express();
var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
      res.send(200);
    }
    else {
      next();
    }
};

app.configure(function () {
  app.use(allowCrossDomain);
});


app.use(express.bodyParser());

// Database connection string: pg://<username>:<password>@host:port/dbname 

//var conString = "pg://cuitailwlenzuo:hg3c_iWgd_9NAKdADhq9H4eaXA@ec2-50-19-246-223.compute-1.amazonaws.com:5432/dfbtujmpbf387c";
//var conString = "pg://postgres:course@localhost:5432/db2";

var conString = process.env.DATABASE_URL;

// REST Operations
// Idea: Data is created, read, updated, or deleted through a URL that 
// identifies the resource to be created, read, updated, or deleted.
// The URL and any other input data is sent over standard HTTP requests.
// Mapping of HTTP with REST 
// a) POST - Created a new object. (Database create operation)
// b) GET - Read an individual object, collection of object, or simple values (Database read Operation)
// c) PUT - Update an individual object, or collection  (Database update operation)
// d) DELETE - Remove an individual object, or collection (Database delete operation)

// REST Operation - HTTP GET 
app.get('/LHL/accounts', function(req, res) {
        console.log("GET");
        
        var client = new pg.Client(conString);
        client.connect();

        var query = client.query("SELECT * FROM account");
        
        query.on("row", function (row, result) {
            result.addRow(row);
        });
        query.on("end", function (result) {
                var response = {"accounts" : result.rows};
                client.end();
                  res.json(response);
         });
});

// REST Operation - HTTP GET 
app.get('/LHL/accountsign/:id', function(req, res) {
        
                var id = req.params.id;
        console.log("Check username availability.");
        
        var client = new pg.Client(conString);
        client.connect();

        var query = client.query("SELECT username FROM account WHERE username='"+ id+"'");
        
        query.on("row", function (row, result) {
            result.addRow(row);
        });
        query.on("end", function (result) {
                var response = {"accounts" : result.rows};
                client.end();
                res.json(response);
         });
});

app.get('/LHL/login/:username/:password', function(req, res) {
        
        var username = req.params.username;
        var password = req.params.password;
        console.log("Username:"+ username+ " and password:"+password);
        var client = new pg.Client(conString);
        client.connect();

        var query = client.query("select * from account natural join (select address as shipping, addressid as shippingid "+ 
                        "from account, address where account.shippingid = address.addressid) as s natural join " +
                        "(select address as billing, b.addressid as billingid, cardnumber " + 
                        "from account, address as b, creditcard as c " +
                        "where account.billingid = b.addressid and c.addressid = b.addressid) as b " + 
                        "where account.username = '" + username + "'");
        
        query.on("row", function (row, result) {
                if(row.apassword == password){
            result.addRow(row);}
        });
        query.on("end", function (result) {
                var response = {"accountLogin" : result.rows};
                client.end();
                  res.json(response);
         });
});


app.get('/LHL/address', function(req, res) {
        console.log("GET");
        
        var client = new pg.Client(conString);
        client.connect();

        var query = client.query("SELECT * from address");
        
        query.on("row", function (row, result) {
            result.addRow(row);
        });
        query.on("end", function (result) {
                var response = {"address" : result.rows};
                client.end();
                  res.json(response);
         });
});

app.get('/LHL/rankers/:id', function(req, res) {
        
        var id = req.params.id;
        console.log("GET rankers:"+ id);
        var client = new pg.Client(conString);
        client.connect();

        var query = client.query("select buyerid, buyer.username, stars, rank.accountid " +
        "from rank, account as buyer " +
                "where buyer.accountid = rank.buyerid and rank.accountid =" + id);
        
        query.on("row", function (row, result) {
            result.addRow(row);
        });
        query.on("end", function (result) {
                var response = {"rankers" : result.rows};
                client.end();
                  res.json(response);
         });
});

app.get('/LHL/profiles/:id', function(req, res) {
        
        var id = req.params.id;
        console.log("GET profile:"+ id);
        var client = new pg.Client(conString);
        client.connect();

        var query = client.query("select * from account, (select (C4.C4*100/Ct.Ct) as percent " +
                                                                "from (select count(rankid) as C4 " +
                                                                "from rank " +
                                                                "where stars = 4 and accountid =" + id +") as C4, " +
                                                                "(select count(rankid) as Ct " +
                                                                "from rank " +
                                                                "where accountid = " + id + ") as Ct) as prank " +
                                                                "where account.accountid =" + id);
        
        query.on("row", function (row, result) {
            result.addRow(row);
        });
        query.on("end", function (result) {
                var response = {"profile" : result.rows};
                client.end();
                  res.json(response);
         });
});



app.get('/LHL/sales/:id', function(req, res) {
        
        var id = req.params.id;
        console.log("GET sales of user:"+ id);
        var client = new pg.Client(conString);
        client.connect();

         var query = client.query("SELECT prodname, price, productid as id, imagelink as img FROM account natural join sale natural join product "+
        "WHERE account.accountid = sale.accountid AND product.productid = sale.prodid AND accountid="+id);
        
        query.on("row", function (row, result) {
            result.addRow(row);
        });
        query.on("end", function (result) {
                var response = {"userSales" : result.rows};
                client.end();
                  res.json(response);
         });
});

app.get('/LHL/auctions/:id', function(req, res) {
        
        var id = req.params.id;
        console.log("GET auctions of user:"+ id);
        var client = new pg.Client(conString);
        client.connect();

        var query = client.query("SELECT prodname, currentbid as price, productid as id, imagelink as img FROM account natural join auction natural join product "+
        "WHERE auction.prodid = product.productid AND auction.accountid = account.accountid AND accountid="+id);
        
        query.on("row", function (row, result) {
            result.addRow(row);
        });
        query.on("end", function (result) {
                var response = {"userAuctions" : result.rows};
                client.end();
                  res.json(response);
         });
         
});

app.get('/LHL/bidsproducts/:id', function(req, res) {
        
        var id = req.params.id;
        console.log("GET bids on product:"+ id);
        var client = new pg.Client(conString);
        client.connect();

        var query = client.query("SELECT prodname, condition, bammmount as bid, productid as id, bid.accountid as bidder, account.username as bidder, bdate "+
                                        "FROM account, bid, auction, product WHERE auction.auctionid = bid.auctionid AND account.accountid= bid.accountid AND "+
                                        "product.productid = auction.prodid AND productid="+id);
        
        query.on("row", function (row, result) {
            result.addRow(row);
        });
        query.on("end", function (result) {
                var response = {"bids" : result.rows};
                client.end();
                  res.json(response);
         });
         
});

app.get('/LHL/bidusers/:id', function(req, res) {
        
        var id = req.params.id;
        console.log("GET bids of user:"+ id);
        var client = new pg.Client(conString);
        client.connect();

        var query = client.query("SELECT prodname, max(bammmount) as bid, imagelink as img, max(bdate) as bdate, account.username as bidder, catid, productid as id "+
                "FROM account, bid, auction, product WHERE auction.auctionid = bid.auctionid AND account.accountid= bid.accountid AND product.productid = auction.prodid "+
                "AND account.accountid= "+id+" GROUP BY prodname, imagelink, account.username, catid, productid");
        
        query.on("row", function (row, result) {
            result.addRow(row);
        });
        query.on("end", function (result) {
                var response = {"biduser" : result.rows};
                client.end();
                  res.json(response);
         });
         
});

app.get('/LHL/purchaseusers/:id', function(req, res) {
        
        var id = req.params.id;
        console.log("GET purchases of user:"+ id);
        var client = new pg.Client(conString);
        client.connect();

        var query = client.query("SELECT prodname, max(bammmount) as bid, imagelink as img, max(bdate) as bdate, account.username as bidder, catid "+
                "FROM account, bid, auction, product WHERE auction.auctionid = bid.auctionid AND account.accountid= bid.accountid AND product.productid = auction.prodid "+
                "AND account.accountid= "+id+" GROUP BY prodname, imagelink, account.username, catid");
        
        query.on("row", function (row, result) {
            result.addRow(row);
        });
        query.on("end", function (result) {
                var response = {"purchaseuser" : result.rows};
                client.end();
                  res.json(response);
         });
         
});

app.get('/LHL/salesusers/:id', function(req, res) {
        
        var id = req.params.id;
        console.log("GET sales of user:"+ id);
        var client = new pg.Client(conString);
        client.connect();

        var query = client.query("SELECT catid, accountid, id, price, condition, img, prodname FROM "+
        "(SELECT catid, accountid, productid as id, price, condition, imagelink as img, prodname "+
                "FROM sale natural join product natural join account natural join category WHERE product.productid = sale.prodid "+
                "AND account.accountid = sale.accountid AND category.catid = product.catid UNION SELECT catid, accountid, productid as id, currentbid as price, condition, imagelink as img, prodname "+
                "FROM product natural join account natural join category natural join auction WHERE category.catid = product.catid AND auction.accountid = account.accountid "+
                "AND auction.prodid = product.productid) as pdt WHERE accountid="+id);
        
        query.on("row", function (row, result) {
            result.addRow(row);
        });
        query.on("end", function (result) {
                var response = {"saleuser" : result.rows};
                client.end();
                  res.json(response);
         });
         
});

app.get('/LHL/sales-product/:id', function(req, res) {
        
        var id = req.params.id;
        console.log("GET sales of user:"+ id);
        var client = new pg.Client(conString);
        client.connect();

        var query = client.query("SELECT prodid as id FROM sale WHERE sale.prodid="+id);
        
        query.on("row", function (row, result) {
            result.addRow(row);
        });
        query.on("end", function (result) {
                var response = {"sale" : result.rows};
                client.end();
                  res.json(response);
         });
});

app.get('/LHL/histories', function(req, res) {
        console.log("GET");
        var response = {"histories" : historyList};
          res.json(response);
});

app.get('/LHL/messages', function(req, res) {
        console.log("GET");

        var response = {"messages" : messageList};
          res.json(response);
});

app.get('/LHL/shoppingcarts', function(req, res) {
        console.log("GET");

        var response = {"shoppingcarts" : shoppingcartList};
          res.json(response);
});

//////// Category

app.get('/LHL/category', function(req, res){

        console.log("GET categories");
        var client = new pg.Client(conString);
        client.connect();
               var query = client.query("SELECT * FROM category WHERE parentid = 0");
        
        query.on("row", function (row, result) {
            result.addRow(row);
        });
        query.on("end", function (result) {
                var response = {"category" : result.rows};
                client.end();
                 res.json(response);
         });
});

app.get('/LHL/categories', function(req, res){

        console.log("GET categories");
        var client = new pg.Client(conString);
        client.connect();

        var query = client.query("SELECT * FROM category");
        
        query.on("row", function (row, result) {
            result.addRow(row);
        });
        query.on("end", function (result) {
                var response = {"categories" : result.rows};
                client.end();
                 res.json(response);
         });
});

app.get('/LHL/subcategory/:id', function(req, res){

                var id = req.params.id;
        console.log("GET categories");
        var client = new pg.Client(conString);
        client.connect();

        var query = client.query("SELECT * FROM category WHERE parentid =" + id);
        
        query.on("row", function (row, result) {
            result.addRow(row);
        });
        query.on("end", function (result) {
                var response = {"subcategory" : result.rows};
                client.end();
                 res.json(response);
         });
});

app.get('/LHL/categoryAll/:id', function(req, res){
        
        var id = req.params.id;
        console.log("GET category:"+ id);
        var client = new pg.Client(conString);
        client.connect();

        var query = client.query("SELECT prodname, id, max(price) as price, img, condition, description, img, catid, catname "+
                                        "FROM ( SELECT prodname, product.productid as id, price, condition, description, imagelink as img, parent.catid as catid, parent.catname as catname "+
                                        "FROM category as parent, category, product natural join sale WHERE category.parentId= parent.catid AND product.catid= category.catid AND product.productid = sale.prodid "+
                                        "UNION SELECT prodname, product.productid as id, currentbid as price, condition, description, imagelink as img, parent.catid as catid, parent.catname as catname "+
                                        "FROM category as parent, category, product natural join auction WHERE category.parentId= parent.catid AND product.catid= category.catid AND product.productid = auction.prodid ) as pdt "+
                                        "WHERE catid="+id+" GROUP BY prodname, id, img, condition, description, img, catid, catname");
        
        query.on("row", function (row, result) {
            result.addRow(row);
        });
        query.on("end", function (result) {
                var response = {"allProducts" : result.rows};
                client.end();
                  res.json(response);
         });
});

app.get('/LHL/categoryProducts/:id', function(req, res){

        var id = req.params.id;
    
                 console.log("GET products in category:"+ id);
        
        var client = new pg.Client(conString);
        client.connect();

        var query = client.query("SELECT prodname, id, price, condition, description, img, catid, catname "+
                "FROM ( SELECT prodname, productid as id, price, condition, description, imagelink as img, catid, catname "+
                "FROM account natural join sale natural join product natural join category WHERE account.accountid = sale.accountid AND product.productid = sale.prodid "+ 
                "AND category.catid= product.catid UNION SELECT prodname, productid as id, max(currentbid) as price, condition, description, imagelink as img, catid, catname "+
                "FROM account natural join auction natural join product natural join category WHERE auction.prodid = product.productid AND auction.accountid = account.accountid AND category.catid= product.catid "+
                "GROUP BY prodname, productid, condition, description, imagelink, catid, catname ) as pdt WHERE catid="+id);
        
        console.log(query);
        
        query.on("row", function (row, result) {
            result.addRow(row);
        });
        
        query.on("end", function (result) {
                var response = {"productsIncategory" : result.rows};
                currentCategory= id;
                client.end();
                  res.json(response);
         });        
});

app.get('/LHL/sortProducts/:id', function(req, res){

        var id = req.params.id;
    
    console.log("Sort by:"+ id);
        
        var client = new pg.Client(conString);
        client.connect();

        if (id== "PriceLow"){
                var query = client.query("SELECT * FROM belongsin, product, category WHERE belongsin.cid = category.catid AND product.productid = belongsin.pid AND category.catid='"+currentCategory+"' ORDER BY product.price");
        }
        
        else if (id== "PriceHigh"){
                var query = client.query("SELECT * FROM belongsin, product, category WHERE belongsin.cid = category.id AND product.id = belongsin.pid AND category.id='"+currentCategory+"' ORDER BY product.price desc");
        }
        
        else if(id=="Name"){
                var query = client.query("SELECT * FROM belongsin, product, category WHERE belongsin.cid = category.id AND product.id = belongsin.pid AND category.id='"+currentCategory+"' ORDER BY product.itemname");
        }
        console.log(query);
        
        query.on("row", function (row, result) {
            result.addRow(row);
        });
        
        query.on("end", function (result) {
                var response = {"productsIncategory" : result.rows};
                client.end();
                  res.json(response);
         });        
});

app.put('/LHL/categories/:id', function(req, res) {

});

app.del('/LHL/categories/:id', function(req, res) {

});

app.post('/LHL/categories', function(req, res) {

});

////////// Product

app.get('/LHL/products/:id', function(req, res){

        var id = req.params.id;
        console.log("GET product:"+ id);
        var client = new pg.Client(conString);
        client.connect();

        var query = client.query(
                "SELECT seller, id, price, starttime, endtime, prodname, condition, description, img, aid " +
                        "FROM ( SELECT username as seller, productid as id, price, starttime, endtime, prodname, condition, description, imagelink as img, accountid as aid "+
                        "FROM account natural join sale natural join product WHERE account.accountid = sale.accountid AND product.productid = sale.prodid UNION "+
                        "SELECT username as seller, productid as id, currentbid as price, startdate as starttime, enddate as endtime, prodname, condition, description, imagelink as img, accountid as aid " + 
                        "FROM account natural join auction natural join product WHERE auction.prodid = product.productid AND auction.accountid = account.accountid) as pdt WHERE id=" + id);
        
        query.on("row", function (row, result) {
            result.addRow(row);
        });
        query.on("end", function (result) {
                var response = {"product" : result.rows};
                client.end();
                  res.json(response);
         });
});

app.get('/LHL/sales', function(req, res){

        //var id = req.params.id;
        console.log("GET sales");
        var client = new pg.Client(conString);
        client.connect();

        var query = client.query("SELECT * FROM sale, product " +
                        "where productid = prodid");
        
        query.on("row", function (row, result) {
            result.addRow(row);
        });
        query.on("end", function (result) {
                var response = {"sales" : result.rows};
                client.end();
                  res.json(response);
         });
});

app.put('/LHL/products/:id', function(req, res) {

});

app.del('/LHL/products/:id', function(req, res) {

});

app.post('/LHL/products', function(req, res) {

});

//////////// History

app.get('/LHL/purchasesusers/:id', function(req, res){
       var id = req.params.id;
        console.log("GET purchases:"+ id);
        var client = new pg.Client(conString);
        client.connect();

        var query = client.query("select * "  +
			"from invoice, checkout, sale, product " +
			"where invoice.invoiceid = checkout.invid and checkout.saleid = sale.saleid " +
			"and sale.prodid = product.productid and invoice.buyerid = " +id);
        
        query.on("row", function (row, result) {
            result.addRow(row);
        });
        query.on("end", function (result) {
                var response = {"purchaseuser" : result.rows};
                client.end();
                  res.json(response);
         });
});

app.get('/LHL/salehistories/:id', function(req, res){
       var id = req.params.id;
        console.log("GET sales:"+ id);
        var client = new pg.Client(conString);
        client.connect();

        var query = client.query("select * "  +
			"from invoice, checkout, sale, product " +
			"where invoice.invoiceid = checkout.invid and checkout.saleid = sale.saleid " +
			"and sale.prodid = product.productid and sale.accountid=" +id);
        
        query.on("row", function (row, result) {
            result.addRow(row);
        });
        query.on("end", function (result) {
                var response = {"salehistories" : result.rows};
                client.end();
                  res.json(response);
         });
});

app.put('/LHL/histories/:hid', function(req, res) {

});

app.del('/LHL/histories/:hid', function(req, res) {

});

app.post('/LHL/histories', function(req, res) {

});

/////////// Messages

app.get('/LHL/message-inbox/:id', function(req, res){

        var id = req.params.id;
        console.log("GET inbox:"+ id);
        var client = new pg.Client(conString);
        client.connect();

        var query = client.query("SELECT date, s.username, receiverid, messageid, subject FROM message, account as s, account as r WHERE s.accountid = message.senderid "+
        "AND r.accountid=message.receiverid AND receiverid=" +id);
        
        query.on("row", function (row, result) {
            result.addRow(row);
        });
        query.on("end", function (result) {
                var response = {"message" : result.rows};
                client.end();
                  res.json(response);
         });
});

app.get('/LHL/message-sent/:id', function(req, res){

        var id = req.params.id;
        console.log("GET outbox:"+ id);
        var client = new pg.Client(conString);
        client.connect();

        var query = client.query("SELECT date, s.username, receiverid, messageid, r.username as receiver, subject FROM message, account as s, account as r WHERE s.accountid = message.senderid "+
        "AND r.accountid=message.receiverid AND senderid=" +id);
        
        query.on("row", function (row, result) {
            result.addRow(row);
        });
        query.on("end", function (result) {
                var response = {"message" : result.rows};
                client.end();
                  res.json(response);
         });
});

app.get('/LHL/message-view/:id', function(req, res){

        var id = req.params.id;
        console.log("GET message:"+ id);
        var client = new pg.Client(conString);
        client.connect();

        var query = client.query("SELECT text, date, s.username as sender, r.username as receiver "+
		"FROM message, account as s, account as r WHERE s.accountid = message.senderid AND r.accountid=message.receiverid AND messageid=" +id);
        
        query.on("row", function (row, result) {
            result.addRow(row);
        });
        query.on("end", function (result) {
                var response = {"message" : result.rows};
                client.end();
                  res.json(response);
         });
});

app.put('/LHL/messages/:mid', function(req, res) {

});

app.del('/LHL/messages/:mid', function(req, res) {

});

app.post('/LHL/messages', function(req, res) {

});

////// Shopping Cart

app.get('/LHL/shoppingcart/:id', function(req, res){
        
            var id = req.params.id;
        console.log("GET shopping cart:"+ id);
        var client = new pg.Client(conString);
        client.connect();

        var query = client.query("SELECT productid as id, imagelink as img, prodname, price FROM containsales natural join shoppingcart, sale natural join product "+
        "WHERE shoppingcart.sid = containsales.sid AND containsales.saleid= sale.saleid AND sale.prodid= product.productid AND shoppingcart.accountid=" + id);
        
        query.on("row", function (row, result) {
            result.addRow(row);
        });
        query.on("end", function (result) {
                var response = {"shoppingcart" : result.rows};
                client.end();
                  res.json(response);
         });
                
    
});

app.put('/LHL/shoppingcarts/:scid', function(req, res) {

});

app.del('/LHL/shoppingcarts/:scid', function(req, res) {

});

app.post('/LHL/shoppingcarts', function(req, res) {

});

////// Account

// REST Operation - HTTP GET to read a car based on its id
app.get('/LHL/accounts/:aid', function(req, res) {
        var aid = req.params.aid;
                console.log("GET account: " + aid);
        var client = new pg.Client(conString);
        client.connect();

        var query = client.query("SELECT * from account where accountid = $1" + [aid]);
        
        query.on("row", function (row, result) {
            result.addRow(row);
        });
        query.on("end", function (result) {
                var len = result.rows.length;
                if (len == 0){
                        res.statusCode = 404;
                        res.send("Account not found.");
                }
                else {        
                          var response = {"account" : result.rows[0]};
                        client.end();
                          res.json(response);
                  }
         });
});

app.get('/LHL/address/:addressid', function(req, res) {
        var addressid = req.params.addressid;
                console.log("GET address: " + addressid);
        var client = new pg.Client(conString);
        client.connect();

        var query = client.query("SELECT * from address where addressid = $1", [addressid]);
        
        query.on("row", function (row, result) {
            result.addRow(row);
        });
        query.on("end", function (result) {
                var len = result.rows.length;
                if (len == 0){
                        res.statusCode = 404;
                        res.send("Address not found.");
                }
                else {        
                          var response = {"address" : result.rows[0]};
                        client.end();
                          res.json(response);
                  }
         });
});


// REST Operation - HTTP PUT to updated an account based on its id
app.put('/LHL/accounts/:aid', function(req, res) {

});

// REST Operation - HTTP DELETE to delete an account based on its id
app.del('/LHL/accounts/:aid', function(req, res) {

});

// REST Operation - HTTP POST to add a new a account
app.post('/LHL/accounts', function(req, res) {

});


// Server starts running when listen is called.
app.listen(process.env.PORT || 3412);
console.log("server listening");