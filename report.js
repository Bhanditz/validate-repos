let data;
const errortypes = {
  "now3cjson": "No w3c.json file",
  "invalidw3cjson": "Invalid data in w3c.json",
  "incompletew3cjson": "Missing data in w3c.json",
  "noashnazg": "Not configured with the Repo Manager",
  "inconsistentstatus": "Inconsistent rec-track status",
  "inconsistentgroups": "Inconsistent groups info w3c.json / repo-manager",
  "nocontributing": "No CONTRIBUTING.md file",
  //    "invalidcontributing": "Invalid CONTRIBUTING.MD file",
  "nolicense": "No LICENSE.md file",
  "nocodeofconduct": "No CODE_OF_CONDUCT.md file",
  "invalidlicense": "Invalid LICENSE.md file",
  "noreadme": "No README.md file"
};
const defaultReport = ["now3cjson", "inconsistengroups", "invalidw3cjson", "incompletew3cjson", "noashnazg", "inconsistentstatus"];

// from https://stackoverflow.com/questions/10970078/modifying-a-query-string-without-reloading-the-page
function insertUrlParam(key, value) {
    if (history.pushState) {
        let searchParams = new URLSearchParams(window.location.search);
        searchParams.set(key, value);
        let newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?' + searchParams.toString();
        window.history.pushState({path: newurl}, '', newurl);
    }
}

// from https://stackoverflow.com/a/5158301
function getUrlParam(name) {
  let searchParams = new URLSearchParams(window.location.search);
  return searchParams.get(name);
}

// Add filter UI
const filterUI = document.getElementById("filter");
const errorSelectorHtml = Object.keys(errortypes).map(t => `<label><input name='filter' type='checkbox' value='${t}'> ${errortypes[t]}</label>`).join(' ');
filterUI.innerHTML = `
 <fieldset><legend>Filter report</legend>
 <label for=grouptype>Group type:</label> <select id='grouptype' name='grouptype'><option value=''>All</option><option value=workinggroup>Working Group</option><option value=communitygroup>Community Group</option></select></label>
 <label for='errors'>Errors:</label> <span id='errors'>${errorSelectorHtml}</span></fieldset>`;

const groupSelector = document.getElementById('grouptype');
const errorSelector = document.getElementById('errors');

if (getUrlParam("grouptype")) {
  [...groupSelector.querySelectorAll('option')].forEach(o => o.selected = false);
  (groupSelector.querySelector(`option[value='${getUrlParam("grouptype")}']`) || {}).selected = true;
}
if (getUrlParam("filter")) {
  errorTypes = getUrlParam("filter").split(',');
  [...errorSelector.querySelectorAll('input')].forEach(inp => inp.checked = errorTypes.includes(inp.value));
} else {
  [...errorSelector.querySelectorAll('input')].forEach(inp => inp.checked = defaultReport.includes(inp.value));
}

groupSelector.addEventListener("change", () => {
  insertUrlParam("grouptype", groupSelector.value);
  writeReport();
});

errorSelector.addEventListener("input", (e) => {
  insertUrlParam("filter", [...errorSelector.querySelectorAll('input:checked')].map(inp => inp.value).join(','));
  writeReport();
});

const writeErrorEntry = (name, list, details) => {
  const li = document.createElement('li');
  const link = document.createElement('a');
  link.href = 'https://github.com/' + name;
  link.appendChild(document.createTextNode(name));
  li.appendChild(link);
  if (details)
    li.appendChild(document.createTextNode(': ' + details));
  list.appendChild(li);
};


fetch("report.json")
  .then(r => r.json())
  .then(fetcheddata => { data = fetcheddata; writeReport();} );


function writeReport() {
  if (!data) return;
  let mentionedRepos = new Set();
  const groupFilter = gid => getUrlParam("grouptype") ? (groups[gid].type || '').replace(' ', '') === getUrlParam("grouptype") : true;
  const errorFilter = new Set((getUrlParam("filter") || defaultReport.join(',')).split(",").filter(e => e !==''));

  const report = document.getElementById('report');
  report.innerHTML = '';
    const groups = data.groups;
    Object.keys(groups).sort((a,b) => groups[a].name.localeCompare(groups[b].name))
      .forEach(groupId => {
        const section = document.createElement('section');
        const title = document.createElement('h2');
        title.appendChild(document.createTextNode(groups[groupId].name));
        if (groupFilter(groupId))
          section.appendChild(title);
        if (groups[groupId].type === "working group" && !groups[groupId].repos.some(r => r.hasRecTrack)) {
          const p = document.createElement('p');
          p.appendChild(document.createTextNode('No identified repo for rec-track spec.'));
          section.appendChild(p);
        }
        if (groups[groupId].repos.length) {
          Object.keys(errortypes).filter(t => errorFilter.size === 0 || errorFilter.has(t))
            .forEach(err => {
              const repos = data.errors[err].filter(r => groups[groupId].repos.find(x => x.fullName === r || x.fullName === r.repo));
              if (repos.length) {
                const errsection = document.createElement('section');
                const errtitle = document.createElement('h3');
                errtitle.appendChild(document.createTextNode(errortypes[err]));
                errsection.appendChild(errtitle);

                const list = document.createElement('ul');
                repos.forEach(repo => {
                  const repoName = typeof repo === "string" ? repo : repo.repo;
                  mentionedRepos.add(repoName);
                  writeErrorEntry(repoName, list, repo.error);

                });
                errsection.appendChild(list);
                if (groupFilter(groupId))
                  section.appendChild(errsection);
              }
            });
        }
        report.appendChild(section);
      });
    const section = document.createElement('section');
    const title = document.createElement('h2');
    title.appendChild(document.createTextNode("No w3c.json"));
    section.appendChild(title);
    const ul = document.createElement('ul');
    data.errors.incompletew3cjson
      .filter(x => x.error === "group")
      .forEach(x => writeErrorEntry(x.repo, ul, "missing group in w3c.json"));
    data.errors.illformedw3cjson
      .forEach(x => writeErrorEntry(x, ul, "ill-formed JSON"));
    data.errors.now3cjson
      .filter(x => x.startsWith('w3c/') || x.startsWith('WICG') || x.startsWith('WebAudio'))
      .filter(x => !mentionedRepos.has(x))
      .forEach(x => writeErrorEntry(x, ul, "no w3c.json"));
    section.appendChild(ul);
    report.appendChild(section);
}

