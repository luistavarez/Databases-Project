// Express is the web framework 
var express = require('express');
var pg = require('pg');
var cloudinary = require('cloudinary');


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
app.post('/LHL/images', function(req, res){
	cloudinary.uploader.upload(req.param('image'),
	function(result) { 
		console.log(result.url); 
		res.json(result.url);
	}, {width: 320, height:420});
});

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
			"(select address as billing, b.addressid as billingid, cardnumber, cardtype, securitynumber, expdate " + 
			"from account, address as b, creditcard as c " +
			"where account.billingid = b.addressid and c.addressid = b.addressid) as b natural join " +
			"(select depositaccountid as depositid, bankaccountnumber as bank FROM depositaccount) as d " + 
			"where account.username = '" + username + "' and account.isactive = 'TRUE'");

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

	var query = client.query("SELECT prodname, price, productid as id, imagelink as img FROM account natural join sale, product "+
			"WHERE product.isactive='t' AND account.accountid = sale.accountid AND product.productid = sale.prodid AND accountid="+id);

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"userSales" : result.rows};
		client.end();
		res.json(response);
	});
});

app.post('/LHL/addsale', function(req, res) {

	console.log("INSERT sale ");
	console.log(req.param('name'));

	var client = new pg.Client(conString);
	client.connect();

	var query= client.query("INSERT INTO sale(saleid, accountid, prodid, starttime, endtime, price, totalquantity) "+
			"VALUES ((select (max(saleid)+1) as saleid from sale), "+req.param('account')+", "+req.param('productid')+", localtimestamp, '"+req.param('date')+" 00:00:00', "+req.param('price')+","+req.param('quantity')+") RETURNING *");

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"addsale" : result.rows};
		client.end();
		res.json(response);
	});
});

app.get('/LHL/auctions/:id', function(req, res) {

	var id = req.params.id;
	console.log("GET auctions of user:"+ id);
	var client = new pg.Client(conString);
	client.connect();

	var query = client.query("SELECT prodname, currentbid as price, productid as id, imagelink as img FROM account natural join auction, product "+
			"WHERE product.isactive='t' AND auction.prodid = product.productid AND auction.accountid = account.accountid AND accountid="+id);

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"userAuctions" : result.rows};
		client.end();
		res.json(response);
	});

});

app.get('/LHL/auction/:id', function(req, res) {

	var id = req.params.id;
	console.log("GET auction :"+ id);
	var client = new pg.Client(conString);
	client.connect();

	var query = client.query("SELECT prodname, currentbid as price, productid as id, imagelink as img FROM account natural join auction, product "+
			"WHERE auction.prodid = product.productid AND auction.accountid = account.accountid AND auction.auctionid="+id);

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"auction" : result.rows};
		client.end();
		res.json(response);
	});

});

app.get('/LHL/auctionProd/:id/:lbid', function(req, res) {

	var id = req.params.id;
	var bid= req.params.lbid;
	console.log("GET auctionid of product:"+ id);
	var client = new pg.Client(conString);
	client.connect();

	var query = client.query("SELECT auctionid, currentbid FROM auction, product WHERE auction.prodid = product.productid AND auction.prodid ="+id+" AND '"+bid+"' > currentbid");

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"auctionProd" : result.rows};
		client.end();
		res.json(response);
	});

});

app.post('/LHL/addauction', function(req, res) {

	console.log("INSERT sale ");
	console.log(req.param('name'));

	var client = new pg.Client(conString);
	client.connect();

	var query= client.query("INSERT INTO auction(auctionid, accountid, prodid, currentbid, startdate, enddate) "+
			"VALUES ((select (max(auctionid)+1) as auctionid from auction), "+req.param('account')+", "+req.param('productid')+","+req.param('price')+", localtimestamp, '"+req.param('date')+" 00:00:00') RETURNING *");

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"addauction" : result.rows};
		client.end();
		res.json(response);
	});
});

app.post('/LHL/addbid', function(req, res) {

	console.log("INSERT bid ");

	var client = new pg.Client(conString);
	client.connect();

	var query= client.query("INSERT INTO bid(bid, accountid, bdate, bammmount, auctionid) "+
			"VALUES ((select (max(bid)+1) as bid from bid), "+req.param('account')+", localtimestamp, "+req.param('bid')+","+req.param('auctionid')+") RETURNING *");

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"addbid" : result.rows};
		client.end();
		res.json(response);
	});
});

app.put('/LHL/updateMaxbid', function(req, res) {

	console.log("UPDATE auction currentbid ");

	var client = new pg.Client(conString);
	client.connect();

	var query= client.query("UPDATE auction SET currentbid="+req.param('bid')+" WHERE auctionid="+req.param('auctionid')+" AND currentbid < '"+req.param('bid')+"' RETURNING *");

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"updateMaxbid" : result.rows};
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
	console.log("GET products bought by user: "+ id);
	var client = new pg.Client(conString);
	client.connect();

	var query = client.query("SELECT invid as invoice, totalprice as price, sale.saleid as saleid, sale.accountid as sellerid, product.productid as productid, " +
	"product.prodname as prodname, account.accountid, product.imagelink as img, checkout.quantity as quantity FROM checkout, sale, product, "+
	"creditcard, address, account where checkout.saleid= sale.saleid and product.productid= sale.prodid and checkout.creditid= creditcard.creditid "+
    "and creditcard.addressid= address.addressid and address.addressid= account.billingid and account.accountid="+id);

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

	var query = client.query("SELECT catid, accountid, id, price, condition, img, prodname, isactive FROM "+
			"(SELECT catid, accountid, productid as id, price, condition, imagelink as img, prodname, product.isactive as isactive "+
			"FROM product natural join category, sale natural join account WHERE product.productid = sale.prodid "+
			"AND account.accountid = sale.accountid AND category.catid = product.catid UNION SELECT catid, accountid, productid as id, currentbid as price, condition, imagelink as img, prodname, product.isactive as isactive "+
			"FROM product natural join category, auction natural join account WHERE category.catid = product.catid AND auction.accountid = account.accountid "+
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
	console.log("GET product id of sale:"+ id);
	var client = new pg.Client(conString);
	client.connect();

	var query = client.query("SELECT prodid as id, totalquantity as quantity FROM sale WHERE sale.prodid="+id);

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"sale" : result.rows};
		client.end();
		res.json(response);
	});
});

app.put('/LHL/updateDeactive', function(req, res) {

	console.log("UPDATE (delete) product from sale/auction");

	var client = new pg.Client(conString);
	client.connect();

	var query= client.query("UPDATE product SET isactive='f' WHERE productid="+req.param('id')+" RETURNING *");

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"updateDeactive" : result.rows};
		client.end();
		res.json(response);
	});
});

app.put('/LHL/updateSale', function(req, res) {

	console.log("UPDATE sale info");

	var client = new pg.Client(conString);
	client.connect();

	var query= client.query("UPDATE sale SET totalquantity= totalquantity-"+req.param('count')+" WHERE prodid="+req.param('id')+" RETURNING *");

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"updateSale" : result.rows};
		client.end();
		res.json(response);
	});
});


app.put('/LHL/updatepname', function(req, res) {

	console.log("UPDATE product name");

	var client = new pg.Client(conString);
	client.connect();

	var query= client.query("UPDATE product SET prodname='"+req.param('name')+"' WHERE productid="+req.param('id')+" RETURNING *");

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"updatepname" : result.rows};
		client.end();
		res.json(response);
	});


});

app.put('/LHL/updatepimage', function(req, res) {

	console.log("UPDATE product image");

	var client = new pg.Client(conString);
	client.connect();

	var query= client.query("UPDATE product SET imagelink='"+req.param('image')+"' WHERE productid="+req.param('id')+" RETURNING *");

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"updatepimage" : result.rows};
		client.end();
		res.json(response);
	});


});

app.put('/LHL/updateprice', function(req, res) {

	console.log("UPDATE product price");

	var client = new pg.Client(conString);
	client.connect();

	var query= client.query("UPDATE sale SET price="+req.param('price')+" WHERE prodid="+req.param('id')+" RETURNING *");

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"updateprice" : result.rows};
		client.end();
		res.json(response);
	});


});

app.put('/LHL/updatepcondition', function(req, res) {

	console.log("UPDATE product condition");

	var client = new pg.Client(conString);
	client.connect();

	var query= client.query("UPDATE product SET condition='"+req.param('condition')+"' WHERE productid="+req.param('id')+" RETURNING *");

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"updatepcondition" : result.rows};
		client.end();
		res.json(response);
	});


});

app.put('/LHL/updatepdescription', function(req, res) {

	console.log("UPDATE product description");

	var client = new pg.Client(conString);
	client.connect();

	var query= client.query("UPDATE product SET description='"+req.param('description')+"' WHERE productid="+req.param('id')+" RETURNING *");

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"updatepdescription" : result.rows};
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

	var query = client.query("SELECT * FROM category WHERE isactive='TRUE' ORDER BY catname");

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"categories" : result.rows};
		client.end();
		res.json(response);
	});
});

app.get('/LHL/todaysales', function(req, res){

	console.log("GET today sales");
	var client = new pg.Client(conString);
	client.connect();

	var query = client.query("SELECT * " +
		"From(SELECT prodid AS ID,prodname AS Name, count(prodname) AS Quantity,sum(totalprice) AS Total " +
		"FROM product, sale NATURAL JOIN checkout,invoice " +
		"WHERE productid = prodid AND invid=invoiceid " +
		"AND date = CURRENT_DATE " +
		"group by prodid,prodname " +
		"UNION " +
		"SELECT prodid AS ID,prodname AS Name, count(prodname) AS Quantity,sum(bidammount) AS Total " +
		"FROM winningBid AS W, auction AS A,product " +
		"WHERE prodid = productid AND W.auctionid=A.auctionid AND W.isPayed " +
		"AND enddate = CURRENT_DATE " +
		"group by prodid,prodname) as SaleInfo " + 
		"NATURAL JOIN (SELECT sum(Quantity) " +
		"FROM(SELECT prodid AS ID,prodname AS Name, count(prodname) AS Quantity,sum(totalprice) AS Total " +
		"FROM product, sale NATURAL JOIN checkout,invoice " +
		"WHERE productid = prodid AND invid=invoiceid " +
		"AND date = CURRENT_DATE " +
		"group by prodid,prodname " +
		"UNION " +
		"SELECT prodid AS ID,prodname AS Name, count(prodname) AS Quantity,sum(bidammount) AS Total " +
		"FROM winningBid AS W, auction AS A,product " +
		"WHERE prodid = productid AND W.auctionid=A.auctionid AND W.isPayed " +
		"AND enddate = CURRENT_DATE " +
		"group by prodid,prodname) as ST)as SaleToday");

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"todaysales" : result.rows};
		client.end();
		res.json(response);
	});
});

app.get('/LHL/weeksales', function(req, res){

	console.log("GET this week sales");
	var client = new pg.Client(conString);
	client.connect();

	var query = client.query("SELECT * " +
			"From(SELECT prodid AS ID,prodname AS Name, count(prodname) AS Quantity,sum(totalprice) AS Total " +
			"FROM product, sale NATURAL JOIN checkout,invoice " +
			"WHERE productid = prodid AND invid=invoiceid " +
			"AND date > CURRENT_DATE-7 " +
			"group by prodid,prodname " +
			"UNION " +
			"SELECT prodid AS ID,prodname AS Name, count(prodname) AS Quantity,sum(bidammount) AS Total " +
			"FROM winningBid AS W, auction AS A,product " +
			"WHERE prodid = productid AND W.auctionid=A.auctionid AND W.isPayed " +
			"AND enddate > CURRENT_DATE-7 " +
			"group by prodid,prodname) as SaleInfo " + 
			"NATURAL JOIN (SELECT sum(Quantity) " +
			"FROM(SELECT prodid AS ID,prodname AS Name, count(prodname) AS Quantity,sum(totalprice) AS Total " +
			"FROM product, sale NATURAL JOIN checkout,invoice " +
			"WHERE productid = prodid AND invid=invoiceid " +
			"AND date > CURRENT_DATE-7 " +
			"group by prodid,prodname " +
			"UNION " +
			"SELECT prodid AS ID,prodname AS Name, count(prodname) AS Quantity,sum(bidammount) AS Total " +
			"FROM winningBid AS W, auction AS A,product " +
			"WHERE prodid = productid AND W.auctionid=A.auctionid AND W.isPayed " +
			"AND enddate > CURRENT_DATE-7 " +
			"group by prodid,prodname) as ST)as SaleToday");

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"weeksales" : result.rows};
		client.end();
		res.json(response);
	});
});

app.get('/LHL/monthsales', function(req, res){

	console.log("GET this month sales");
	var client = new pg.Client(conString);
	client.connect();

	var query = client.query("SELECT * " +
			"From(SELECT prodid AS ID,prodname AS Name, count(prodname) AS Quantity,sum(totalprice) AS Total " +
			"FROM product, sale NATURAL JOIN checkout,invoice " +
			"WHERE productid = prodid AND invid=invoiceid " +
			"AND EXTRACT(MONTH FROM date) > EXTRACT(MONTH FROM CURRENT_DATE)-1 " +
			"group by prodid,prodname " +
			"UNION " +
			"SELECT prodid AS ID,prodname AS Name, count(prodname) AS Quantity,sum(bidammount) AS Total " +
			"FROM winningBid AS W, auction AS A,product " +
			"WHERE prodid = productid AND W.auctionid=A.auctionid AND W.isPayed " +
			"AND EXTRACT(MONTH FROM enddate) > EXTRACT(MONTH FROM CURRENT_DATE)-1 " +
			"group by prodid,prodname) as SaleInfo " + 
			"NATURAL JOIN (SELECT sum(Quantity) " +
			"FROM(SELECT prodid AS ID,prodname AS Name, count(prodname) AS Quantity,sum(totalprice) AS Total " +
			"FROM product, sale NATURAL JOIN checkout,invoice " +
			"WHERE productid = prodid AND invid=invoiceid " +
			"AND EXTRACT(MONTH FROM date) > EXTRACT(MONTH FROM CURRENT_DATE)-1 " +
			"group by prodid,prodname " +
			"UNION " +
			"SELECT prodid AS ID,prodname AS Name, count(prodname) AS Quantity,sum(bidammount) AS Total " +
			"FROM winningBid AS W, auction AS A,product " +
			"WHERE prodid = productid AND W.auctionid=A.auctionid AND W.isPayed " +
			"AND EXTRACT(MONTH FROM enddate) > EXTRACT(MONTH FROM CURRENT_DATE)-1 " +
			"group by prodid,prodname) as ST)as SaleToday");

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"monthsales" : result.rows};
		client.end();
		res.json(response);
	});
});


app.get('/LHL/subcategory/:id', function(req, res){

	var id = req.params.id;
	console.log("GET categories");
	var client = new pg.Client(conString);
	client.connect();

	var query = client.query("SELECT category.catid as catid, category.catname as catname, parent.catname as parentname, category.parentid FROM category, category as parent "+
			"WHERE parent.catid= category.parentid AND category.parentid=" + id);

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
	console.log("GET all products in category:"+ id);
	var client = new pg.Client(conString);
	client.connect();

	var query = client.query("SELECT prodname, id, max(price) as price, img, condition, description, img, catid, catname, isactive "+
			"FROM ( SELECT prodname, product.productid as id, price, condition, description, imagelink as img, parent.catid as catid, parent.catname as catname, product.isactive as isactive "+
			"FROM category as parent, category, product natural join sale WHERE category.parentId= parent.catid AND product.catid= category.catid AND product.productid = sale.prodid "+
			"UNION SELECT prodname, product.productid as id, currentbid as price, condition, description, imagelink as img, parent.catid as catid, parent.catname as catname, product.isactive as isactive "+
			"FROM category as parent, category, product natural join auction WHERE category.parentId= parent.catid AND product.catid= category.catid AND product.productid = auction.prodid ) as pdt "+
			"WHERE isactive='t' AND catid="+id+" GROUP BY prodname, id, img, condition, description, img, catid, catname, isactive ");

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"allProducts" : result.rows};
		client.end();
		res.json(response);
	});
});

app.get('/LHL/searchAll/:term', function(req, res){
	
	var term = req.params.term;
	var terms= term.split(/[ ,]+/);
	console.log("Searching for terms "+terms);

	var msg= "";

	for(var i=0; i < terms.length; i++){
		if(i==0){
			msg+="prodname ilike '%"+terms[i]+"%' ";
		}
		else{
			msg+="or prodname ilike '%"+terms[i]+"%' ";
		}
	}

	console.log("GET products from search of terms: "+ term);

	var client = new pg.Client(conString);
	client.connect();

	var query = client.query("SELECT prodname, id, price, condition, description, img, catid, catname, isactive "+
			"FROM ( SELECT prodname, productid as id, price, condition, description, imagelink as img, catid, catname, product.isactive as isactive "+
			"FROM account natural join sale natural join product natural join category WHERE account.accountid = sale.accountid AND product.productid = sale.prodid "+ 
			"AND category.catid= product.catid UNION SELECT prodname, productid as id, max(currentbid) as price, condition, description, imagelink as img, catid, catname, product.isactive as isactive "+
			"FROM account natural join auction natural join product natural join category WHERE auction.prodid = product.productid AND auction.accountid = account.accountid AND category.catid= product.catid "+
			"GROUP BY prodname, productid, condition, description, imagelink, catid, catname, isactive ) as pdt WHERE isactive='t' AND "+msg);

	query.on("row", function (row, result) {
		result.addRow(row);
	});

	query.on("end", function (result) {
		var response = {"searchresult" : result.rows};
		client.end();
		res.json(response);
	});        
});

app.get('/LHL/searchSub/:term/:id', function(req, res){

	var id= req.params.id;
	var term = req.params.term;
	var terms= term.split(/[ ,]+/);

	var msg= "";

	for(var i=0; i < terms.length; i++){
		if(i==0){
			msg+="prodname ilike '%"+terms[i]+"%' ";
		}
		else{
			msg+="or prodname ilike '%"+terms[i]+"%' ";
		}
	}

	console.log("GET products from search in subcategory of terms: "+ term);

	var client = new pg.Client(conString);
	client.connect();

	var query = client.query("SELECT prodname, id, max(price) as price, img, condition, description, img, catid, catname, isactive "+
			"FROM ( SELECT prodname, product.productid as id, price, condition, description, imagelink as img, parent.catid as catid, parent.catname as catname, product.isactive as isactive "+
			"FROM category as parent, category, product natural join sale WHERE category.parentId= parent.catid AND product.catid= category.catid AND product.productid = sale.prodid "+
			"UNION SELECT prodname, product.productid as id, currentbid as price, condition, description, imagelink as img, parent.catid as catid, parent.catname as catname, product.isactive as isactive "+
			"FROM category as parent, category, product natural join auction WHERE category.parentId= parent.catid AND product.catid= category.catid AND product.productid = auction.prodid ) as pdt "+
			"WHERE isactive='t' AND catid="+id+" AND ("+msg+") GROUP BY prodname, id, img, condition, description, img, catid, catname, isactive");

	query.on("row", function (row, result) {
		result.addRow(row);
	});

	query.on("end", function (result) {
		var response = {"searchresult" : result.rows};
		client.end();
		res.json(response);
	});        
});


app.get('/LHL/sortbyterms/:id/:term/:all', function(req, res){
	
	var id= req.params.id;
	var all= req.params.all;
	var term = req.params.term;
	var terms= term.split(/[ ,]+/);
	console.log("Sort terms "+terms+" by "+ id);

	var msg= "";

	for(var i=0; i < terms.length; i++){
		if(i==0){
			msg+="prodname ilike '%"+terms[i]+"%' ";
		}
		else{
			msg+="or prodname ilike '%"+terms[i]+"%' ";
		}
	}

	var client = new pg.Client(conString);
	client.connect();
	
	if(all == "true"){
		
		if (id== "PriceLow"){
		var query = client.query("SELECT prodname, id, price, condition, description, img, catid, catname, isactive "+
			"FROM ( SELECT prodname, productid as id, price, condition, description, imagelink as img, catid, catname, product.isactive as isactive "+
			"FROM account natural join sale natural join product natural join category WHERE account.accountid = sale.accountid AND product.productid = sale.prodid "+ 
			"AND category.catid= product.catid UNION SELECT prodname, productid as id, max(currentbid) as price, condition, description, imagelink as img, catid, catname, product.isactive as isactive "+
			"FROM account natural join auction natural join product natural join category WHERE auction.prodid = product.productid AND auction.accountid = account.accountid AND category.catid= product.catid "+
			"GROUP BY prodname, productid, condition, description, imagelink, catid, catname, isactive ) as pdt WHERE isactive='t' AND "+msg+ "ORDER BY price");
	}

	else if (id== "PriceHigh"){
				var query = client.query("SELECT prodname, id, price, condition, description, img, catid, catname, isactive "+
			"FROM ( SELECT prodname, productid as id, price, condition, description, imagelink as img, catid, catname, product.isactive as isactive"+
			"FROM account natural join sale natural join product natural join category WHERE account.accountid = sale.accountid AND product.productid = sale.prodid "+ 
			"AND category.catid= product.catid UNION SELECT prodname, productid as id, max(currentbid) as price, condition, description, imagelink as img, catid, catname, product.isactive as isactive "+
			"FROM account natural join auction natural join product natural join category WHERE auction.prodid = product.productid AND auction.accountid = account.accountid AND category.catid= product.catid "+
			"GROUP BY prodname, productid, condition, description, imagelink, catid, catname, isactive ) as pdt WHERE isactive='t' AND "+msg+ "ORDER BY price desc");
	}

	else if(id=="Name"){
				var query = client.query("SELECT prodname, id, price, condition, description, img, catid, catname, isactive "+
			"FROM ( SELECT prodname, productid as id, price, condition, description, imagelink as img, catid, catname, product.isactive as isactive "+
			"FROM account natural join sale natural join product natural join category WHERE account.accountid = sale.accountid AND product.productid = sale.prodid "+ 
			"AND category.catid= product.catid UNION SELECT prodname, productid as id, max(currentbid) as price, condition, description, imagelink as img, catid, catname, product.isactive as isactive "+
			"FROM account natural join auction natural join product natural join category WHERE auction.prodid = product.productid AND auction.accountid = account.accountid AND category.catid= product.catid "+
			"GROUP BY prodname, productid, condition, description, imagelink, catid, catname, isactive ) as pdt WHERE isactive='t' AND "+msg+ "ORDER BY prodname");
	}
		
	}
	else{
		if (id== "PriceLow"){
		var query = client.query("SELECT prodname, id, max(price) as price, img, condition, description, img, catid, catname, isactive "+
			"FROM ( SELECT prodname, product.productid as id, price, condition, description, imagelink as img, parent.catid as catid, parent.catname as catname, product.isactive as isactive "+
			"FROM category as parent, category, product natural join sale WHERE category.parentId= parent.catid AND product.catid= category.catid AND product.productid = sale.prodid "+
			"UNION SELECT prodname, product.productid as id, currentbid as price, condition, description, imagelink as img, parent.catid as catid, parent.catname as catname, product.isactive as isactive "+
			"FROM category as parent, category, product natural join auction WHERE category.parentId= parent.catid AND product.catid= category.catid AND product.productid = auction.prodid ) as pdt "+
			"WHERE isactive='t' AND catid="+id+" AND ("+msg+") GROUP BY prodname, id, img, condition, description, img, catid, catname, isactive ORDER BY price");
	}

	else if (id== "PriceHigh"){
	var query = client.query("SELECT prodname, id, max(price) as price, img, condition, description, img, catid, catname, isactive "+
			"FROM ( SELECT prodname, product.productid as id, price, condition, description, imagelink as img, parent.catid as catid, parent.catname as catname, product.isactive as isactive "+
			"FROM category as parent, category, product natural join sale WHERE category.parentId= parent.catid AND product.catid= category.catid AND product.productid = sale.prodid "+
			"UNION SELECT prodname, product.productid as id, currentbid as price, condition, description, imagelink as img, parent.catid as catid, parent.catname as catname, product.isactive as isactive "+
			"FROM category as parent, category, product natural join auction WHERE category.parentId= parent.catid AND product.catid= category.catid AND product.productid = auction.prodid ) as pdt "+
			"WHERE isactive='t' AND catid="+id+" AND ("+msg+") GROUP BY prodname, id, img, condition, description, img, catid, catname, isactive ORDER BY price desc");
	}

	else if(id=="Name"){
	var query = client.query("SELECT prodname, id, max(price) as price, img, condition, description, img, catid, catname, isactive "+
			"FROM ( SELECT prodname, product.productid as id, price, condition, description, imagelink as img, parent.catid as catid, parent.catname as catname, product.isactive as isactive "+
			"FROM category as parent, category, product natural join sale WHERE category.parentId= parent.catid AND product.catid= category.catid AND product.productid = sale.prodid "+
			"UNION SELECT prodname, product.productid as id, currentbid as price, condition, description, imagelink as img, parent.catid as catid, parent.catname as catname, product.isactive as isactive "+
			"FROM category as parent, category, product natural join auction WHERE category.parentId= parent.catid AND product.catid= category.catid AND product.productid = auction.prodid ) as pdt "+
			"WHERE isactive='t' AND catid="+id+" AND ("+msg+") GROUP BY prodname, id, img, condition, description, img, catid, catname, isactive Order BY prodname");
	
	}}
	

	query.on("row", function (row, result) {
		result.addRow(row);
	});

	query.on("end", function (result) {
		var response = {"productsortsearch" : result.rows};
		client.end();
		res.json(response);
	});        
});

app.get('/LHL/categoryProducts/:id', function(req, res){

	var id = req.params.id;

	console.log("GET products in category:"+ id);

	var client = new pg.Client(conString);
	client.connect();

	var query = client.query("SELECT prodname, id, price, condition, description, img, catid, catname, isactive "+
			"FROM ( SELECT prodname, productid as id, price, condition, description, imagelink as img, catid, catname, product.isactive as isactive "+
			"FROM account natural join sale, product natural join category WHERE account.accountid = sale.accountid AND product.productid = sale.prodid "+ 
			"AND category.catid= product.catid UNION SELECT prodname, productid as id, max(currentbid) as price, condition, description, imagelink as img, catid, catname, product.isactive as isactive "+
			"FROM account natural join auction, product natural join category WHERE auction.prodid = product.productid AND auction.accountid = account.accountid AND category.catid= product.catid "+
			"GROUP BY prodname, productid, condition, description, imagelink, catid, catname, product.isactive) as pdt WHERE isactive= 't' AND catid="+id);

	query.on("row", function (row, result) {
		result.addRow(row);
	});

	query.on("end", function (result) {
		var response = {"productsIncategory" : result.rows};
		client.end();
		res.json(response);
	});        
});

app.get('/LHL/sortProducts/:id/:catid', function(req, res){

	var id = req.params.id;
	var catid= req.params.catid;

	console.log("Sort by:"+ id + " in category "+catid);

	var client = new pg.Client(conString);
	client.connect();

	if (id== "PriceLow"){
		var query = client.query("SELECT prodname, id, price, condition, description, img, catid, catname, isactive "+
				"FROM ( SELECT prodname, productid as id, price, condition, description, imagelink as img, catid, catname, product.isactive as isactive "+
				"FROM account natural join sale, product natural join category WHERE account.accountid = sale.accountid AND product.productid = sale.prodid "+ 
				"AND category.catid= product.catid UNION SELECT prodname, productid as id, max(currentbid) as price, condition, description, imagelink as img, catid, catname, product.isactive as isactive "+
				"FROM account natural join auction, product natural join category WHERE auction.prodid = product.productid AND auction.accountid = account.accountid AND category.catid= product.catid "+
				"GROUP BY prodname, productid, condition, description, imagelink, catid, catname, product.isactive ) as pdt WHERE isactive= 't' AND catid="+catid+" ORDER BY price");
	}

	else if (id== "PriceHigh"){
		var query = client.query("SELECT prodname, id, price, condition, description, img, catid, catname, isactive "+
				"FROM ( SELECT prodname, productid as id, price, condition, description, imagelink as img, catid, catname, product.isactive as isactive "+
				"FROM account natural join sale, product natural join category WHERE account.accountid = sale.accountid AND product.productid = sale.prodid "+ 
				"AND category.catid= product.catid UNION SELECT prodname, productid as id, max(currentbid) as price, condition, description, imagelink as img, catid, catname, product.isactive as isactive "+
				"FROM account natural join auction, product natural join category WHERE auction.prodid = product.productid AND auction.accountid = account.accountid AND category.catid= product.catid "+
				"GROUP BY prodname, productid, condition, description, imagelink, catid, catname, product.isactive ) as pdt WHERE isactive= 't' AND catid="+catid+" ORDER BY price desc");
	}

	else if(id=="Name"){
		var query = client.query("SELECT prodname, id, price, condition, description, img, catid, catname, isactive "+
				"FROM ( SELECT prodname, productid as id, price, condition, description, imagelink as img, catid, catname, product.isactive as isactive "+
				"FROM account natural join sale, product natural join category WHERE account.accountid = sale.accountid AND product.productid = sale.prodid "+ 
				"AND category.catid= product.catid UNION SELECT prodname, productid as id, max(currentbid) as price, condition, description, imagelink as img, catid, catname, product.isactive as isactive "+
				"FROM account natural join auction, product natural join category WHERE auction.prodid = product.productid AND auction.accountid = account.accountid AND category.catid= product.catid "+
				"GROUP BY prodname, productid, condition, description, imagelink, catid, catname, product.isactive ) as pdt WHERE isactive= 't' AND catid="+catid+" ORDER BY prodname");
	}

	query.on("row", function (row, result) {
		result.addRow(row);
	});

	query.on("end", function (result) {
		var response = {"productsIncategory" : result.rows};
		client.end();
		res.json(response);
	});        
});

app.get('/LHL/sortAllProducts/:id/:patid', function(req, res){

	var id = req.params.id;
	var catid= req.params.patid;

	console.log("Sort all by:"+ id + " in category "+catid);

	var client = new pg.Client(conString);
	client.connect();

	if (id== "PriceLow"){
		var query = client.query("SELECT prodname, id, max(price) as price, img, condition, description, img, catid, catname, isactive "+
				"FROM ( SELECT prodname, product.productid as id, price, condition, description, imagelink as img, parent.catid as catid, parent.catname as catname, product.isactive as isactive "+
				"FROM category as parent, category, product natural join sale WHERE category.parentId= parent.catid AND product.catid= category.catid AND product.productid = sale.prodid "+
				"UNION SELECT prodname, product.productid as id, currentbid as price, condition, description, imagelink as img, parent.catid as catid, parent.catname as catname, product.isactive as isactive "+
				"FROM category as parent, category, product natural join auction WHERE category.parentId= parent.catid AND product.catid= category.catid AND product.productid = auction.prodid ) as pdt "+
				"WHERE isactive= 't' AND catid="+catid+" GROUP BY prodname, id, img, condition, description, img, catid, catname, isactive ORDER BY price");
	}

	else if (id== "PriceHigh"){
		var query = client.query("SELECT prodname, id, max(price) as price, img, condition, description, img, catid, catname, isactive "+
				"FROM ( SELECT prodname, product.productid as id, price, condition, description, imagelink as img, parent.catid as catid, parent.catname as catname, product.isactive as isactive "+
				"FROM category as parent, category, product natural join sale WHERE category.parentId= parent.catid AND product.catid= category.catid AND product.productid = sale.prodid "+
				"UNION SELECT prodname, product.productid as id, currentbid as price, condition, description, imagelink as img, parent.catid as catid, parent.catname as catname, product.isactive as isactive "+
				"FROM category as parent, category, product natural join auction WHERE category.parentId= parent.catid AND product.catid= category.catid AND product.productid = auction.prodid ) as pdt "+
				"WHERE isactive= 't' AND catid="+catid+" GROUP BY prodname, id, img, condition, description, img, catid, catname, isactive ORDER BY price desc");
	}

	else if(id=="Name"){
		var query = client.query("SELECT prodname, id, max(price) as price, img, condition, description, img, catid, catname, isactive "+
				"FROM ( SELECT prodname, product.productid as id, price, condition, description, imagelink as img, parent.catid as catid, parent.catname as catname, product.isactive as isactive "+
				"FROM category as parent, category, product natural join sale WHERE category.parentId= parent.catid AND product.catid= category.catid AND product.productid = sale.prodid "+
				"UNION SELECT prodname, product.productid as id, currentbid as price, condition, description, imagelink as img, parent.catid as catid, parent.catname as catname, product.isactive as isactive "+
				"FROM category as parent, category, product natural join auction WHERE category.parentId= parent.catid AND product.catid= category.catid AND product.productid = auction.prodid ) as pdt "+
				"WHERE isactive= 't' AND catid="+catid+" GROUP BY prodname, id, img, condition, description, img, catid, catname, isactive ORDER BY prodname");
	}

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

app.post('/LHL/categories/:id', function(req, res) {
	var id = req.params.id;
	console.log("DELETE category: "+ id);
	var client = new pg.Client(conString);
	client.connect();

	var query = client.query("UPDATE category SET isactive='FALSE' " +
			"WHERE catid= " + id);

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

app.post('/LHL/categories', function(req, res) {
	console.log("POST category: ");
	var client = new pg.Client(conString);
	client.connect();

	var query = client.query("INSERT INTO category (catid, catname, parentid)" +
			"values ((select (max(catid)+1) as catid from category), '" + req.param('name')+ "', " 
			+ req.param('parent')+ ") RETURNING *");

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
			client.end();
			res.json(response);
	});
	//console.log(req.param('parent'));
});

////////// Product

app.get('/LHL/products/:id', function(req, res){

	var id = req.params.id;
	console.log("GET product:"+ id);
	var client = new pg.Client(conString);
	client.connect();

	var query = client.query(
			"SELECT seller, saleid, id, price, starttime, endtime, prodname, condition, description, img, aid, isactive " +
					"FROM ( SELECT username as seller, saleid, productid as id, price, starttime, endtime, prodname, condition, description, imagelink as img, accountid as aid, product.isactive as isactive "+
					"FROM account natural join sale, product WHERE account.accountid = sale.accountid AND product.productid = sale.prodid UNION "+
					"SELECT username as seller, auctionid as saleid, productid as id, currentbid as price, startdate as starttime, enddate as endtime, prodname, condition, description, imagelink as img, accountid as aid, product.isactive as isactive " + 
					"FROM account natural join auction, product WHERE auction.prodid = product.productid AND auction.accountid = account.accountid) as pdt WHERE id=" + id);

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"product" : result.rows};
		client.end();
		res.json(response);
	});
});

app.get('/LHL/allProducts', function(req, res){

	console.log("GET all products");
	var client = new pg.Client(conString);
	client.connect();

	var query = client.query("SELECT * FROM product natural join category WHERE isactive= 't'");

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"products" : result.rows};
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
			"where productid = prodid AND product.isactive= 't'");

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

	console.log("INSERT product ");
	console.log(req.param('name'));

	var client = new pg.Client(conString);
	client.connect();

	var query = client.query("INSERT INTO product(productid, catid, prodname, condition, description, imagelink) "+
			"VALUES ((select (max(productid)+1) as productid from product), "+ req.param('catid')+", '"+ req.param('name')+"' , '"+ req.param('condition')+"', '"+ req.param('description')+"', '"+req.param('image')+"')  RETURNING *");

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"productadd" : result.rows};
		client.end();
		res.json(response);
	});
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

app.get('/LHL/messages/:mid', function(req, res) {
	var mid = req.params.mid;
	console.log("GET message: " + mid);
	if ((mid < 0)){ //|| (mid >= midNextId)){
		// not found
		res.statusCode = 404;
		res.send("Message not found.");
	}
	else {
		var target = -1;
		for (var i=0; i < messageList.length; ++i){
			if (messageList[i].mid == mid){
				target = i;
				break;        
			}
		}
		if (target == -1){
			res.statusCode = 404;
			res.send("Message not found.");
		}
		else {
			var response = {"message" : messageList[target]};
			res.json(response);        
		}        
	}
});

app.get('/LHL/message-inbox/:id', function(req, res){

	var id = req.params.id;
	console.log("GET inbox:"+ id);
	var client = new pg.Client(conString);
	client.connect();

	var query = client.query("SELECT date, s.username, receiverid, messageid, subject FROM message, account as s, account as r WHERE s.accountid = message.senderid "+
			"AND r.accountid=message.receiverid AND message.isactive='t' AND receiverid=" +id);

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

	var query = client.query("SELECT date, s.username as receiver, receiverid, messageid, subject FROM message, account as s, account as r WHERE s.accountid = message.senderid "+
			"AND r.accountid=message.receiverid AND message.isactive='t' AND senderid=" +id);

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

	var query = client.query("SELECT text, date, s.username as sender, r.username as receiver, subject "+
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

app.put('/LHL/deletembox', function(req, res) {

	console.log("UPDATE (delete) message");

	var client = new pg.Client(conString);
	client.connect();

	var query= client.query("UPDATE message SET isactive='f' WHERE messageid="+req.param('messageid')+" RETURNING *");

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"deletembox" : result.rows};
		client.end();
		res.json(response);
	});
});

app.post('/LHL/addmessage', function(req, res) {
	console.log("Send message to: "+req.param('receiverid'));

	var client = new pg.Client(conString);
	client.connect();

	var query= client.query("INSERT INTO message(messageid, senderid, text, date, receiverid, subject) VALUES ((select (max(messageid)+1) as messageid from message), "+req.param('senderid')+",'"+req.param('text')+"', localtimestamp, "+
			req.param('receiverid')+",'"+req.param('subject')+"') RETURNING *");

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"addmessage" : result.rows};
		client.end();
		res.json(response);
	});
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

app.get('/LHL/accountid/:user', function(req, res) {
	var user = req.params.user;
	console.log("GET accountid of username: " + user);
	var client = new pg.Client(conString);
	client.connect();

	var query = client.query("SELECT accountid from account where username = '"+user+"'");

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
app.post('/LHL/accounts/', function(req, res) {
	console.log("PUT account: " + req.param('username'));
	var client = new pg.Client(conString);
	client.connect();
	
	var query = client.query("UPDATE address SET address = '"+req.param("shipping")+"'" +
		"where addressid = (SELECT shippingid FROM account WHERE username = '"+req.param("username")+"');" +
		"UPDATE address SET address = '"+req.param("billing")+"'" +
		"where addressid = (SELECT billingid FROM account WHERE username = '"+req.param("username")+"');" +
		"UPDATE depositaccount SET bankaccountnumber = '"+req.param("bank")+"'" +
		"WHERE depositaccountid = (SELECT depositid FROM account WHERE username = '"+req.param("username")+"');" +
		"UPDATE creditcard SET cardtype = '"+req.param("credittype")+"', cardnumber = '"+req.param("creditnumber")+"', securitynumber = '"+req.param("securitynumber")+"'," +
		"expdate = '"+req.param("expdate")+"'" +
		"WHERE addressid = (SELECT billingid FROM account WHERE username = '"+req.param("username")+"');"+
		"UPDATE account SET username = '"+req.param("username")+"', fname = '"+req.param("fname")+"', lname = '"+req.param("lname")+"',"+
		"email = '"+req.param("email")+"', apassword = '"+req.param("password")+"'"+
		"where username = '"+req.param("username")+"'");
		
	/*var query = client.query("UPDATE account SET apassword= '" + req.param('password') + "' " +
			"WHERE username= '" + req.param('username') + "' RETURNING account.username");*/
	
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
			var response = {"accounts" : result.rows[0]};
			client.end();
			
			res.json(response);
		}
	});
});

app.put('/LHL/accountfname/', function(req, res) {
	console.log("PUT account: " + req.param('username') + ", " + req.param('password'));
	var client = new pg.Client(conString);
	client.connect();
	// Hay que buscar el query correcto
	var query = client.query("UPDATE account SET fname= '" + req.param('password') + "' " +
			"WHERE username= '" + req.param('username') + "' RETURNING account.username");
	
	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"accountfname" : result.rows};
		client.end();
		res.json(response);
	});
});

app.put('/LHL/accountlname/', function(req, res) {
	console.log("PUT account: " + req.param('username') + ", " + req.param('password'));
	var client = new pg.Client(conString);
	client.connect();
	// Hay que buscar el query correcto
	var query = client.query("UPDATE account SET lname= '" + req.param('password') + "' " +
			"WHERE username= '" + req.param('username') + "' RETURNING account.username");
	
	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"accountlname" : result.rows};
		client.end();
		res.json(response);
	});
});

app.put('/LHL/accountshipping/', function(req, res) {
	console.log("PUT account: " + req.param('username') + ", " + req.param('password'));
	var client = new pg.Client(conString);
	client.connect();
	// Hay que buscar el query correcto
	var query = client.query("UPDATE address SET address= '" + req.param('password') + "' " +
			"WHERE addressid = (SELECT shippingid FROM account WHERE username = '" + req.param('username') + "')  RETURNING *");
	
	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"accountshipping" : result.rows};
		client.end();
		res.json(response);
	});
});

app.put('/LHL/accountbilling/', function(req, res) {
	console.log("PUT account: " + req.param('username') + ", " + req.param('password'));
	var client = new pg.Client(conString);
	client.connect();
	// Hay que buscar el query correcto
	var query = client.query("UPDATE address SET address= '" + req.param('password') + "' " +
			"WHERE addressid = (SELECT billingid FROM account WHERE username = '" + req.param('username') + "')  RETURNING *");
	
	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"accountbilling" : result.rows};
		client.end();
		res.json(response);
	});
});

app.put('/LHL/accountcardnumber/', function(req, res) {
	console.log("PUT account: " + req.param('username') + ", " + req.param('password'));
	var client = new pg.Client(conString);
	client.connect();
	// Hay que buscar el query correcto
	var query = client.query("UPDATE creditcard SET cardnumber= '" + req.param('password') + "' " +
			"WHERE addressid = (SELECT billingid FROM account WHERE username = '" + req.param('username') + "')  RETURNING *");
	
	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"accountcardnumber" : result.rows};
		client.end();
		res.json(response);
	});
});

app.put('/LHL/accountcardtype/', function(req, res) {
	console.log("PUT account: " + req.param('username') + ", " + req.param('password'));
	var client = new pg.Client(conString);
	client.connect();
	// Hay que buscar el query correcto
	var query = client.query("UPDATE creditcard SET cardnumber= '" + req.param('password') + "' " +
			"WHERE addressid = (SELECT billingid FROM account WHERE username = '" + req.param('username') + "')  RETURNING *");
	
	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"accountcardtype" : result.rows};
		client.end();
		res.json(response);
	});
});

app.put('/LHL/accountsecurity/', function(req, res) {
	console.log("PUT account: " + req.param('username') + ", " + req.param('password'));
	var client = new pg.Client(conString);
	client.connect();
	// Hay que buscar el query correcto
	var query = client.query("UPDATE creditcard SET securitynumber= '" + req.param('password') + "' " +
			"WHERE addressid = (SELECT billingid FROM account WHERE username = '" + req.param('username') + "')  RETURNING *");
	
	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"accountsecurity" : result.rows};
		client.end();
		res.json(response);
	});
});

app.put('/LHL/accountexpdate/', function(req, res) {
	console.log("PUT account: " + req.param('username') + ", " + req.param('password'));
	var client = new pg.Client(conString);
	client.connect();
	// Hay que buscar el query correcto
	var query = client.query("UPDATE creditcard SET expdate= '" + req.param('password') + "' " +
			"WHERE addressid = (SELECT billingid FROM account WHERE username = '" + req.param('username') + "')  RETURNING *");
	
	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"accountexpdate" : result.rows};
		client.end();
		res.json(response);
	});
});

app.put('/LHL/accountemail/', function(req, res) {
	console.log("PUT account: " + req.param('username') + ", " + req.param('password'));
	var client = new pg.Client(conString);
	client.connect();
	// Hay que buscar el query correcto
	var query = client.query("UPDATE account SET email= '" + req.param('password') + "' " +
			"WHERE username = '" + req.param('username') + "' RETURNING *");
	
	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"accountemail" : result.rows};
		client.end();
		res.json(response);
	});
});

app.put('/LHL/accountbank/', function(req, res) {
	console.log("PUT account: " + req.param('username') + ", " + req.param('password'));
	var client = new pg.Client(conString);
	client.connect();
	// Hay que buscar el query correcto
	var query = client.query("UPDATE depositaccountid SET bankaccountnumber= '" + req.param('password') + "' " +
			"WHERE depositaccountid = (SELECT depositid FROM account WHERE username = '" + req.param('username') + "')  RETURNING *");
	
	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"accountbank" : result.rows};
		client.end();
		res.json(response);
	});
});


app.put('/LHL/accountspassword/', function(req, res) {
	console.log("PUT account: " + req.param('username') + ", " + req.param('password'));
	var client = new pg.Client(conString);
	client.connect();
	// Hay que buscar el query correcto
	var query = client.query("UPDATE account SET apassword= '" + req.param('password') + "' " +
			"WHERE username= '" + req.param('username') + "' RETURNING account.username");
	
	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"accountspassword" : result.rows};
		client.end();
		res.json(response);
	});
});

app.post('/LHL/accountspassword/', function(req, res) {
	console.log("PUT account: " + req.param('username') + ", " + req.param('password'));
	var client = new pg.Client(conString);
	client.connect();

	var query = client.query("UPDATE account SET apassword= '" + req.param('password') + "' " +
			"WHERE username= '" + req.param('username') + "' RETURNING account.username");
	
	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"accountspassword" : result.rows};
		client.end();
		res.json(response);
	});
});

app.post('/LHL/rankuser/', function(req, res) {
	console.log("POST rank: " + req.param('user') + ", " + req.param('ranking'));
	var client = new pg.Client(conString);
	client.connect();
	// Hay que buscar el query correcto
	var query = client.query("INSERT INTO rank (rankid, accountid, stars, buyerid) " +
		"VALUES ((select (max(rankid)+1) as rankid from rank),"+ req.param('seller') +
		", "+ req.param('ranking') +", "+ req.param('user') +")");
	/*var query = client.query("UPDATE account SET apassword= '" + req.param('password') + "' " +
			"WHERE username= '" + req.param('username') + "' RETURNING account.username");*/
	
	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"rankuser" : result.rows};
		client.end();
		res.json(response);
	});
});

// REST Operation - HTTP DELETE to delete an account based on its id
app.post('/LHL/accountsdeleted/', function(req, res) {
	console.log("DELETE account: " + req.param('delusername'));
	var client = new pg.Client(conString);
	client.connect();
	// Hay que buscar el query correcto
	var query = client.query("UPDATE account SET isactive='FALSE' " +
			"WHERE username= '" + req.param('delusername') + "' RETURNING *");
	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"accountsdeleted" : result.rows};
		client.end();
		res.json(response);
	});
});

app.put('/LHL/accountsdelete/:id', function(req, res) {
	var id = req.params.id;
	console.log("DELETE account: " + id);
	var client = new pg.Client(conString);
	client.connect();
	// Hay que buscar el query correcto
	var query = client.query("UPDATE account SET isactive='FALSE' " +
			"WHERE accountid= '" + id + "'");
			
	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"accountsdelete" : result.rows};
		client.end();
		res.json(response);
	});
});

// REST Operation - HTTP POST to add a new a account
app.post('/LHL/accountscreated', function(req, res) {
	console.log("POST account: " + req.param('username'));
	var client = new pg.Client(conString);
	client.connect();

	var query = client.query("with said as(insert into address(addressid, address)" + 
		"VALUES((select (max(addressid)+1) as addressid from address), '"+ req.param('shipping') +"')" + "returning addressid), "  +
		"baid as(insert into address(addressid, address) VALUES((select (max(addressid)+2) as addressid from address), '"+ req.param('billing') +"') returning addressid), " +
		"daid as(insert into depositaccount(depositaccountid, bankaccountnumber) " +
		"VALUES((select (max(depositaccountid)+1) as depositaccountid from depositaccount),'"+ req.param('bank') +"') " +
		"returning depositaccountid), " +
		"aid as(insert into account (accountid, username, fname, lname,email, apassword, shippingid, billingid, depositid) " +
		"values((select (max(accountid)+1) as accountid from account),'"+ req.param('username') +"','"+ req.param('fname') +
		"','"+ req.param('lname') +"','"+ req.param('email') +"','"+ req.param('password') +
		"', " +	"(select addressid from said) " + ",(select addressid from baid) " + ",(select depositaccountid from daid))returning*) " +
		"insert into creditcard " +
		"values((select (max(creditid)+1) as creditid from creditcard),(select billingid from aid),'"+ req.param('credittype') +
		"','"+ req.param('creditnumber') +"','"+ req.param('securitynumber') +"','"+ req.param('expdate') +"');");
		
	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"accountscreated" : result.rows};
		client.end();
		res.json(response);
	});
});

app.post('/LHL/insertinvoice', function(req, res) {

	console.log("INSERT invoice ");

	var client = new pg.Client(conString);
	client.connect();

	var query= client.query("INSERT INTO invoice(invoiceid, buyerid, date) "+
			"VALUES ((select (max(invoiceid)+1) as invoiceid from invoice), "+req.param('buyerid')+", localtimestamp) RETURNING *");

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"insertinvoice" : result.rows};
		client.end();
		res.json(response);
	});
});


app.post('/LHL/insertcheckout', function(req, res) {

	console.log("INSERT checkout ");
	var client = new pg.Client(conString);
	client.connect();

	var query= client.query("INSERT INTO checkout(checkoutid, creditid, invid, totalprice, saleid, quantity) " +
	"VALUES ((select (max(checkoutid)+1) as checkoutid from checkout), "+req.param('creditid')+","+req.param('invoiceid')+","+req.param('totalprice')+","+req.param('saleid')+","+
	req.param('count')+") RETURNING *");

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"insertcheckout" : result.rows};
		client.end();
		res.json(response);
	});
});

app.get('/LHL/creditinfo/:id', function(req, res) {
	var id = req.params.id;
	console.log("Get credit information.");
	
	var client = new pg.Client(conString);
	client.connect();

	var query = client.query("SELECT creditid FROM creditcard, address, account where creditcard.addressid = address.addressid "+
	"AND address.addressid= account.billingid AND accountid="+id);

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"creditinfo" : result.rows};
		client.end();
		res.json(response);
	});
});

app.get('/LHL/choosewinning', function(req, res) {
	var id= req.param('auctionid');
	
	console.log("Get winning bid information of auction: "+id);
	
	var client = new pg.Client(conString);
	client.connect();

	var query = client.query("SELECT bid, bid.accountid as bidder, bammmount, auction.auctionid, auction.accountid as owner, prodid, bdate FROM bid, auction " +
	"WHERE auction.auctionid=bid.auctionid AND auction.currentbid = bid.bammmount AND auction.auctionid="+id);

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"choosewinning" : result.rows};
		client.end();
		res.json(response);
	});
});

app.post('/LHL/insertwinningbid', function(req, res) {

	console.log("INSERT winning bid");
	var client = new pg.Client(conString);
	client.connect();

	var query= client.query("INSERT INTO winningbid(bid, accountid, auctionid, bidammount, creditid) "+
    "VALUES ("+req.param('bid')+","+req.param('bidder')+","+req.param('auctionid')+", '"+
    req.param('bidammmount')+"' , "+req.param('creditid')+") RETURNING *");

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"insertwinningbid" : result.rows};
		client.end();
		res.json(response);
	});
});

app.get('/LHL/getwinningbids/:id', function(req, res) {
	var id= req.params.id;
	
	console.log("Get unapproved winning bids of account: "+id);
	
	var client = new pg.Client(conString);
	client.connect();

	var query = client.query("SELECT auction.auctionid as auctionid, product.productid as productid, product.prodname as prodname, winningbid.bidammount as price,"+
	" product.imagelink as imagelink FROM winningbid, auction, product where winningbid.auctionid= auction.auctionid"+
	" and product.productid= auction.prodid and isapproved='f' and auction.accountid="+id);

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"getwinningbids" : result.rows};
		client.end();
		res.json(response);
	});
});

app.put('/LHL/updatewinningbid', function(req, res) {

	console.log("UPDATE (approve) winning bid ");

	var client = new pg.Client(conString);
	client.connect();

	var query= client.query("UPDATE winningbid SET isapproved='t' WHERE auctionid="+req.param('auctionid')+" RETURNING *");

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"updatewinningbid" : result.rows};
		client.end();
		res.json(response);
	});
});

app.get('/LHL/winningbid/:id', function(req, res) {
	var id= req.params.id;
	
	console.log("Get unapproved winning bids of account: "+id);
	
	var client = new pg.Client(conString);
	client.connect();

	var query = client.query("SELECT ispayed, product.prodname as prodname, auction.auctionid as auctionid, auction.currentbid as price, product.imagelink as img, "+
	" winningbid.creditid as creditid from winningbid,auction,product where auction.prodid= product.productid and auction.auctionid= winningbid.auctionid "+
	" and auction.currentbid = winningbid.bidammount and isapproved='t' and winningbid.accountid="+id);

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"winningbid" : result.rows};
		client.end();
		res.json(response);
	});
});

app.put('/LHL/updatepaymentwinningbid', function(req, res) {
	var id= req.param('auctionid');
	console.log("UPDATE (payment) winning bid ");

	var client = new pg.Client(conString);
	client.connect();

	var query= client.query("UPDATE winningbid SET ispayed='t' WHERE auctionid="+id+" RETURNING *");

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"updatepaymentwinningbid" : result.rows};
		client.end();
		res.json(response);
	});
});

app.get('/LHL/invoice/:id', function(req, res) {

	var id = req.params.id;
	console.log("GET products bought by user: "+ id);
	var client = new pg.Client(conString);
	client.connect();

	var query = client.query("SELECT invoice.invoiceid as invoice, invoice.date as date, checkout.totalprice as totalprice, sale.price as price, "+
	" checkout.quantity as quantity, checkout.saleid as saleid, product.prodname as prodname FROM invoice, checkout, sale, product, creditcard "+
	" WHERE invoice.invoiceid= checkout.invid AND checkout.saleid= sale.saleid AND sale.prodid= product.productid AND creditcard.creditid=checkout.creditid AND invoice.invoiceid="+id);

	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		var response = {"invoiceuser" : result.rows};
		client.end();
		res.json(response);
	});

});

var interval = setInterval(function(){checkSale();},1800000);
/*
function checkAuction(){
	var client = new pg.Client(conString);
	client.connect();
	
	var query = client.query("With aupdate as(UPDATE product SET isactive = FALSE WHERE productid IN " +
"(select prodid from auction,product where productid=prodid " + 
"AND enddate < current_timestamp and isactive) Returning *), " +
"win as(SELECT buyer.accountid as buyer, buyer.username as buyername, " +
"A.auctionid as auction,prodname as pname, " +
"A.accountid as seller,bid.bdate as date,max,creditid " +
"FROM auction as A, (select * from aupdate) as product,address NATURAL JOIN creditcard, " + 
"account as buyer NATURAL JOIN bid NATURAL JOIN " +
"(select auctionid,max(bammmount)as max " +
"from bid " +
"group by auctionid)as MaxBids "+ 
"WHERE A.auctionid=MaxBids.auctionid AND max=bammmount AND prodid=productid " +
"AND address.addressid=buyer.billingid AND A.prodid=productid), "+
"w2 as( "+
"INSERT INTO winningbid(bid,accountid,auctionid,biddate,bidammount,creditid) "+
"Values(default,(SELECT buyer from win), " +
"(SELECT auction FROM win),(SELECT date FROM win),(SELECT max FROM win), "+ 
"(SELECT creditid FROM win)) RETURNING*), " +
"w3 as (Select buyer,pname,buyername,max,seller FROM win NATURAL JOIN w2) "+
"INSERT INTO message(messageid,senderid,receiverid,subject,text,date) "+
"VALUES((select (max(messageid)+1) as messageid from message) " +
",(select buyer from w3),(select seller from w3),'Auction Ended', " +
"'The winning bid of your auction on: '||(select prodname from w3)||" has been placed with a total of: "||(select max from w3)||"." + "+
""To accept this bid, check your auction status at Items bidding in your profile page. Have a good day!",current_timestamp), " +
"((select (max(messageid)+2) as messageid from message) " +
",(select seller from w3),(select buyer from w3),'Auction Ended', "+
"'You won the auction '||(select prodname from w3)||'! Please check your pending payments. Have a good day!'," " +
"current_timestamp)"); 	
	console.log('Auctions Updated');
	client.end();
}
*/
function checkSale(){
	var client = new pg.Client(conString);
	client.connect();
	
	var query = client.query("UPDATE product SET isactive = FALSE WHERE productid IN(select prodid from sale,product where productid=prodid AND endtime < current_timestamp and isactive)"); 	
	console.log('Sales Updated');
	client.end();
}

// Server starts running when listen is called.
app.listen(process.env.PORT || 3412);
console.log("server listening");