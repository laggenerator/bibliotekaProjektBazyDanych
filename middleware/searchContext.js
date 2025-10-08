function setSearchContext(req, res, next){
  res.locals.isAdminRoute = false;
  res.locals.searchEndpoint = '/ksiazki/wyszukaj'
  res.locals.searchPlaceholder = 'Wyszukaj po ISBN, tytule lub autorze...'
  if(req.path.startsWith('/admin')){
    res.locals.isAdminRoute = true;
    res.locals.searchEndpoint = '/admin/wyszukaj-ksiazke'
    res.locals.searchPlaceholder = 'Wyszukaj w panelu admina po ISBN, tytule lub autorze...'
  }
  next();
}

module.exports = setSearchContext;