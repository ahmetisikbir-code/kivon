(function(){
  var current = location.pathname.split('/').pop() || 'index.html';
  var links = [
    { href:'index.html', label:'Ana Sayfa' },
    { href:'30-cozum.html', label:'Çözümler' },
    { href:'urunler.html', label:'Paketler' },
    { href:'veri-broker.html', label:'Veri Broker' },
    { href:'blog.html', label:'Blog' }
  ];
  var nav = document.createElement('nav');
  nav.innerHTML = '<a href="index.html" class="nav-logo"><span>KIVON</span> AI</a><div class="nav-links">' +
    links.map(function(l){ return '<a href="'+l.href+'"'+(current===l.href?' class="active"':'')+'>'+l.label+'</a>'; }).join('') +
    '</div>';
  document.body.insertBefore(nav, document.body.firstChild);
})();
