// Run O1, lot H2a: a small stand-in for the design tool's support.js (it is not in docs/o1/design/fanquiz-hub/). It reads a
// *.dc.html file the way the file describes itself: <sc-for list as>, <sc-if value>, {{path}} values, onClick={{fn}}, and the
// Component class of the script at the bottom (renderVals, state, setState). It exists only to render the design for the
// comparison of docs/o1/reports/H2/. Query string: ?signedIn=1 sets the signedIn prop; ?state={"filter":"kpop"} presets the state.
(function () {
  class DCLogic {
    constructor(props) { this.props = props || {}; this.state = {}; this._render = null; }
    setState(patch) { this.state = Object.assign({}, this.state, patch); if (this._render) this._render(); }
  }
  window.DCLogic = DCLogic;

  function lookup(path, scopes) {
    var parts = path.trim().split('.');
    for (var i = scopes.length - 1; i >= 0; i--) {
      var s = scopes[i];
      if (s && Object.prototype.hasOwnProperty.call(s, parts[0])) {
        var v = s[parts[0]];
        for (var j = 1; j < parts.length && v != null; j++) v = v[parts[j]];
        return v;
      }
    }
    return undefined;
  }
  var FULL = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;
  function interp(str, scopes) {
    return str.replace(/\{\{\s*([^}]+?)\s*\}\}/g, function (_, p) {
      if (p === 'true') return 'true';
      if (p === 'false') return 'false';
      var v = lookup(p, scopes);
      return v == null ? '' : String(v);
    });
  }
  function truthy(expr, scopes) {
    var m = FULL.exec(expr || '');
    if (!m) return false;
    if (m[1] === 'true') return true;
    if (m[1] === 'false') return false;
    return !!lookup(m[1], scopes);
  }
  function renderNode(node, scopes, out) {
    if (node.nodeType === 3) { out.appendChild(document.createTextNode(interp(node.nodeValue, scopes))); return; }
    if (node.nodeType !== 1) return;
    var tag = node.tagName.toLowerCase();
    if (tag === 'sc-for') {
      var m = FULL.exec(node.getAttribute('list') || '');
      var list = (m && lookup(m[1], scopes)) || [];
      var as = node.getAttribute('as');
      list.forEach(function (item) {
        var sc = {}; sc[as] = item;
        node.childNodes.forEach(function (c) { renderNode(c, scopes.concat([sc]), out); });
      });
      return;
    }
    if (tag === 'sc-if') {
      if (truthy(node.getAttribute('value'), scopes)) node.childNodes.forEach(function (c) { renderNode(c, scopes, out); });
      return;
    }
    var el = document.createElementNS(node.namespaceURI, node.localName);
    Array.prototype.forEach.call(node.attributes, function (a) {
      if (a.name.indexOf('hint-') === 0) return;
      var fm = FULL.exec(a.value);
      if (/^on/i.test(a.name) && fm) {
        var fn = lookup(fm[1], scopes);
        if (typeof fn === 'function') el.addEventListener(a.name.slice(2).toLowerCase(), fn);
        return;
      }
      el.setAttribute(a.name, interp(a.value, scopes));
    });
    node.childNodes.forEach(function (c) { renderNode(c, scopes, el); });
    out.appendChild(el);
  }

  function boot() {
    var root = document.querySelector('x-dc');
    var scriptEl = document.querySelector('script[data-dc-script]');
    var propsDef = {};
    try { propsDef = JSON.parse(scriptEl.getAttribute('data-props') || '{}'); } catch (e) { /* none */ }
    var props = {};
    Object.keys(propsDef).forEach(function (k) { if (k[0] !== '$' && propsDef[k] && 'default' in propsDef[k]) props[k] = propsDef[k].default; });
    var q = new URLSearchParams(location.search);
    if (q.get('signedIn')) props.signedIn = q.get('signedIn') === '1';
    var Component = new Function('DCLogic', scriptEl.textContent + '\nreturn Component;')(DCLogic);
    var comp = new Component(props);
    if (q.get('state')) comp.state = Object.assign({}, comp.state, JSON.parse(q.get('state')));
    var helmet = root.querySelector('helmet');
    if (helmet) { Array.prototype.slice.call(helmet.children).forEach(function (c) { document.head.appendChild(c); }); helmet.remove(); }
    var template = document.createElement('div');
    while (root.firstChild) template.appendChild(root.firstChild);
    comp._render = function () {
      var vals = comp.renderVals();
      var out = document.createDocumentFragment();
      template.childNodes.forEach(function (c) { renderNode(c, [vals], out); });
      root.replaceChildren(out);
    };
    comp._render();
    window.__dc = comp;
    document.documentElement.setAttribute('data-dc-ready', '1');
  }
  document.addEventListener('DOMContentLoaded', boot);
})();
