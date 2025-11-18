const $ = id => document.getElementById(id);
    const fetchBtn = $('fetchBtn');
    const output = $('output');
    const status = $('status');

    function showStatus(msg, type='info'){
      if(type==='loading'){
        status.innerHTML = `<div style="display:flex;gap:8px;align-items:center"><span class="loader"></span><strong> ${msg}</strong></div>`
      } else if(type==='error'){
        status.innerHTML = `<div class="error">${msg}</div>`
      } else {
        status.textContent = msg;
      }
    }

    function clear(){ output.innerHTML = ''; status.innerHTML = '' }

    function buildHeaders(token){
      const headers = { 'Accept': 'application/vnd.github.v3+json' };
      if(token) headers['Authorization'] = `token ${token}`;
      return headers;
    }

    async function fetchJson(url, token){
      const res = await fetch(url, { headers: buildHeaders(token) });
      // helpful debug: uncomment to inspect headers
      // console.log(res.status, res.headers.get('x-ratelimit-remaining'));
      if(!res.ok){
        const body = await res.json().catch(()=>({message:res.statusText}));
        const err = new Error(body.message || res.statusText);
        err.status = res.status;
        throw err;
      }
      return res.json();
    }

    function renderProfile(user){
      return `
        <div class="profile">
          <img class="avatar" src="${user.avatar_url}" alt="avatar" />
          <div class="meta">
            <h2>${user.name || user.login}</h2>
            <p class="small">@${user.login} • ${user.company || ''} ${user.location? '• ' + user.location : ''}</p>
            <p>${user.bio || ''}</p>
            <div class="stats">
              <div class="stat">📦 ${user.public_repos} repos</div>
              <div class="stat">👥 ${user.followers} followers</div>
              <div class="stat">🔁 ${user.following} following</div>
            </div>
          </div>
        </div>
      `;
    }

    function renderRepos(repos){
      if(!repos || repos.length===0) return '<p class="small">No repos found.</p>';
      return `<div class="repo-list">${repos.map(r => `
        <div class="repo">
          <div class="left">
            <h3><a href="${r.html_url}" target="_blank" rel="noopener">${r.name}</a></h3>
            <p>${r.description || ''}</p>
            <div class="meta small">
              <span>★ ${r.stargazers_count}</span>
              <span>🍴 ${r.forks_count}</span>
              ${r.language? `<span>• ${r.language}</span>`: ''}
              <span>• Updated ${new Date(r.updated_at).toLocaleString()}</span>
            </div>
          </div>
          <div class="right small">${r.private? 'Private' : 'Public'}</div>
        </div>
      `).join('')}</div>`;
    }

    async function doFetch(){
      const username = $('username').value.trim();
      const token = $('token').value.trim() || null;
      const perPage = $('perPage').value;
      const sort = $('sort').value;

      if(!username){ showStatus('Please enter a GitHub username', 'error'); return }
      clear();
      showStatus('Fetching user and repos...', 'loading');
      fetchBtn.disabled = true;

      try{
        // 1) user profile
        const userUrl = `https://api.github.com/users/${encodeURIComponent(username)}`;
        const user = await fetchJson(userUrl, token);

        // 2) repos (one page, perPage up to 100)
        const reposUrl = `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=${perPage}&sort=${sort}`;
        const repos = await fetchJson(reposUrl, token);

        output.innerHTML = renderProfile(user) + renderRepos(repos);
        showStatus(`Fetched profile and ${repos.length} repos.`);

      } catch(err){
        console.error(err);
        if(err.status === 404){
          showStatus('User not found (404). Check the username.', 'error');
        } else if(err.status === 401){
          showStatus('Unauthorized (401). If you used a token, check its permissions.', 'error');
        } else if(err.status === 403){
          showStatus('Rate limit or forbidden (403). Try adding a personal access token to increase rate limits.', 'error');
        } else {
          showStatus(`Error: ${err.message || 'Unknown error'}`, 'error');
        }
      } finally{
        fetchBtn.disabled = false;
      }
    }

    fetchBtn.addEventListener('click', doFetch);
    $('username').addEventListener('keydown', e => { if(e.key === 'Enter') doFetch(); });

    // Auto-run once on load with the default username
    window.addEventListener('load', () => {
      // keep a tiny delay so UI shows
      setTimeout(() => fetchBtn.click(), 200);
    });