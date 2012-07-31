<%- include('header.ejs', locals) %>
<div id="package">
  <h1><%- title %></h1>
  <p class="description">
    <% if (page > 0) { %>
      <a href="/browse/<%= browseby %>/<%= page - 1 %>/">&larr; previous</a>
    <% } %>
    Page <%= page + 1 %>
    <% if (items.length >= pageSize) { %>
      <a href="/browse/<%= browseby %>/<%= page + 1 %>/">next &rarr;</a>
    <% } %>
  </p>
  <%
  items = items.filter(function (p) { return p.name })

  if (items.length) {
    items.forEach(function (p) {
      if (!p.name) return
      %>
      <div class="row">
        <p><a href="<%= p.url %>"><%= p.name %></a>
          <%= p.description || '' %></p>
      </div>
      <%
    })
  } else {
    %>
    <div class="row"><p>No items found.</p></div>
    <%
  }
  %>
  <p class="description">
    <% if (page > 0) { %>
      <a href="/browse/<%= browseby %>/<%= page - 1 %>/">&larr; previous</a>
    <% } %>
    Page <%= page + 1 %>
    <% if (items.length >= pageSize) { %>
      <a href="/browse/<%= browseby %>/<%= page + 1 %>/">next &rarr;</a>
    <% } %>
  </p>
</div>
<%- include('footer.ejs', locals) %>
