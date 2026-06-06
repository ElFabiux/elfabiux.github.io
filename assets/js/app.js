(function () {
  const config = window.PORTFOLIO_CONFIG || {};
  const data = window.PortfolioData;
  const ui = window.PortfolioUI;

  function setState(target, message, state) {
    if (!target) return;

    target.textContent = message;
    target.dataset.state = state || "";
    target.hidden = !message;
  }

  function finishLoading(target) {
    const section = target && target.closest("[data-loading-section]");

    if (section) {
      section.setAttribute("aria-busy", "false");
    }
  }

  function clearAndAppend(container, items) {
    container.replaceChildren(...items);
  }

  function normalizeProject(row) {
    return {
      title: row.title || "Untitled project",
      stack: row.stack || "",
      filterStack: data.splitList(row.filterStack),
      description: row.description || "",
      githubUrl: row.githubUrl || ""
    };
  }

  function normalizeCareerEntry(row) {
    return {
      title: row.title || "Untitled entry",
      organization: row.organization || "",
      location: row.location || "",
      startDate: row.startDate || "",
      endDate: row.endDate || "",
      description: row.description || "",
      type: row.type || ""
    };
  }

  function normalizeCertification(row) {
    const rawStatus = String(row.status || "").trim();
    const normalizedStatus =
      rawStatus.toLowerCase() === "planed"
        ? "Planned"
        : rawStatus.toLowerCase() === "done"
          ? "Done"
          : rawStatus;

    return {
      name: row.name || "Untitled certification",
      issuer: row.issuer || "",
      status: normalizedStatus,
      topics: data.splitList(row.topic),
      date: row.date || "",
      description: row.description || "",
      imageUrl: row.imageUrl || "",
      credentialUrl: row.credentialUrl || ""
    };
  }

  function renderHome(profile) {
    const nameTarget = document.querySelector("[data-profile-name]");
    const descriptionTarget = document.querySelector("[data-profile-description]");
    const linksTarget = document.querySelector("[data-home-links]");

    if (nameTarget) nameTarget.textContent = profile.name || "Portfolio Owner";
    if (descriptionTarget) descriptionTarget.textContent = profile.description || "";

    if (linksTarget) {
      const links = [
        ui.createExternalLink("LinkedIn", profile.linkedinUrl, "command-button"),
        ui.createExternalLink("GitHub", profile.githubUrl, "command-button")
      ].filter(Boolean);

      clearAndAppend(linksTarget, links);
    }
  }

  async function renderProjects() {
    const filterContainer = document.querySelector("[data-project-filters]");
    const listContainer = document.querySelector("[data-projects-list]");
    const stateTarget = document.querySelector("[data-projects-state]");
    const selectedStacks = new Set();
    let projects = [];

    function updateList() {
      const filteredProjects =
        selectedStacks.size === 0
          ? projects
          : projects.filter((project) =>
              project.filterStack.some(
                (stack) =>
                  Array.from(selectedStacks).some(
                    (selectedStack) => stack.toLowerCase() === selectedStack.toLowerCase()
                  )
              )
            );

      ui.renderToggleFilters(
        filterContainer,
        data.uniqueValues(projects.flatMap((project) => project.filterStack)),
        selectedStacks,
        (value) => {
          if (selectedStacks.has(value)) {
            selectedStacks.delete(value);
          } else {
            selectedStacks.add(value);
          }
          updateList();
        }
      );

      if (filteredProjects.length === 0) {
        clearAndAppend(listContainer, []);
        setState(stateTarget, "No projects match this filter.", "empty");
        finishLoading(stateTarget);
        return;
      }

      setState(stateTarget, "", "");
      clearAndAppend(
        listContainer,
        filteredProjects.map((project) => ui.createProjectItem(project))
      );
      finishLoading(stateTarget);
    }

    try {
      const rows = await data.fetchCsv(config.dataSources.projects);
      projects = data.visibleAndSorted(rows).map(normalizeProject);

      if (projects.length === 0) {
        clearAndAppend(listContainer, []);
        ui.renderToggleFilters(filterContainer, [], selectedStacks, () => {});
        setState(stateTarget, "No visible projects are available.", "empty");
        finishLoading(stateTarget);
        return;
      }

      updateList();
    } catch (error) {
      console.error("Projects could not be loaded.", error);
      clearAndAppend(listContainer, []);
      setState(
        stateTarget,
        "Projects could not be loaded. Check the public CSV URL in config.js.",
        "error"
      );
      finishLoading(stateTarget);
    }
  }

  async function renderCareer() {
    const sectionsContainer = document.querySelector("[data-career-sections]");
    const educationList = document.querySelector("[data-education-list]");
    const experienceList = document.querySelector("[data-experience-list]");
    const educationState = document.querySelector("[data-education-state]");
    const experienceState = document.querySelector("[data-experience-state]");
    const stateTarget = document.querySelector("[data-career-state]");

    try {
      const rows = await data.fetchCsv(config.dataSources.educationExperience);
      const entries = data.visibleAndSorted(rows).map(normalizeCareerEntry);
      const educationEntries = entries.filter(
        (entry) => entry.type.trim().toLowerCase() === "education"
      );
      const experienceEntries = entries.filter(
        (entry) => entry.type.trim().toLowerCase() === "experience"
      );
      const categorizedEntryCount = educationEntries.length + experienceEntries.length;

      if (categorizedEntryCount === 0) {
        clearAndAppend(educationList, []);
        clearAndAppend(experienceList, []);
        sectionsContainer.hidden = true;
        setState(
          stateTarget,
          entries.length === 0
            ? "No visible education or experience entries are available."
            : "No entries use the Education or Experience type.",
          "empty"
        );
        finishLoading(stateTarget);
        return;
      }

      setState(stateTarget, "", "");
      sectionsContainer.hidden = false;
      clearAndAppend(
        educationList,
        educationEntries.map((entry) => ui.createCareerItem(entry))
      );
      clearAndAppend(
        experienceList,
        experienceEntries.map((entry) => ui.createCareerItem(entry))
      );
      setState(
        educationState,
        educationEntries.length === 0 ? "No education entries are available." : "",
        "empty"
      );
      setState(
        experienceState,
        experienceEntries.length === 0 ? "No experience entries are available." : "",
        "empty"
      );
      finishLoading(stateTarget);
    } catch (error) {
      console.error("Education and experience could not be loaded.", error);
      clearAndAppend(educationList, []);
      clearAndAppend(experienceList, []);
      sectionsContainer.hidden = true;
      setState(
        stateTarget,
        "Education and experience could not be loaded. Check the public CSV URL in config.js.",
        "error"
      );
      finishLoading(stateTarget);
    }
  }

  async function renderCertifications() {
    const statusFilters = document.querySelector("[data-certification-status-filters]");
    const topicFilters = document.querySelector("[data-certification-topic-filters]");
    const listContainer = document.querySelector("[data-certifications-list]");
    const stateTarget = document.querySelector("[data-certifications-state]");
    let selectedStatus = "All";
    const selectedTopics = new Set();
    let certifications = [];

    function updateList() {
      const filteredCertifications = certifications.filter((certification) => {
        const matchesStatus =
          selectedStatus === "All" ||
          certification.status.toLowerCase() === selectedStatus.toLowerCase();
        const matchesTopic =
          selectedTopics.size === 0 ||
          certification.topics.some(
            (topic) =>
              Array.from(selectedTopics).some(
                (selectedTopic) => topic.toLowerCase() === selectedTopic.toLowerCase()
              )
          );
        return matchesStatus && matchesTopic;
      });

      ui.renderFilters(
        statusFilters,
        data.uniqueValues(certifications.map((certification) => certification.status)),
        selectedStatus,
        (value) => {
          selectedStatus = value;
          updateList();
        }
      );

      ui.renderToggleFilters(
        topicFilters,
        data.uniqueValues(certifications.flatMap((certification) => certification.topics)),
        selectedTopics,
        (value) => {
          if (selectedTopics.has(value)) {
            selectedTopics.delete(value);
          } else {
            selectedTopics.add(value);
          }
          updateList();
        }
      );

      if (filteredCertifications.length === 0) {
        clearAndAppend(listContainer, []);
        setState(stateTarget, "No certifications match these filters.", "empty");
        finishLoading(stateTarget);
        return;
      }

      setState(stateTarget, "", "");
      clearAndAppend(
        listContainer,
        filteredCertifications.map((certification) =>
          ui.createCertificationItem(certification)
        )
      );
      finishLoading(stateTarget);
    }

    try {
      const rows = await data.fetchCsv(config.dataSources.certifications);
      certifications = data.visibleAndSorted(rows).map(normalizeCertification);

      if (certifications.length === 0) {
        clearAndAppend(listContainer, []);
        ui.renderFilters(statusFilters, [], "All", () => {});
        ui.renderToggleFilters(topicFilters, [], selectedTopics, () => {});
        setState(stateTarget, "No visible certifications are available.", "empty");
        finishLoading(stateTarget);
        return;
      }

      updateList();
    } catch (error) {
      console.error("Certifications could not be loaded.", error);
      clearAndAppend(listContainer, []);
      setState(
        stateTarget,
        "Certifications could not be loaded. Check the public CSV URL in config.js.",
        "error"
      );
      finishLoading(stateTarget);
    }
  }

  function renderContact(profile) {
    const contactList = document.querySelector("[data-contact-list]");
    if (!contactList) return;

    const contactItems = [
      {
        label: "email",
        value: profile.email,
        link: profile.email ? `mailto:${profile.email}` : ""
      },
      { label: "linkedin", value: "LinkedIn", link: profile.linkedinUrl },
      { label: "github", value: "GitHub", link: profile.githubUrl }
    ];

    const elements = [];

    contactItems.forEach((item) => {
      if (!item.value || !item.link) return;

      const term = ui.createElement("dt", "", item.label);
      const description = ui.createElement("dd");
      const link = ui.createExternalLink(item.value, item.link, "contact-link");

      if (link) {
        description.appendChild(link);
        elements.push(term, description);
      }
    });

    clearAndAppend(contactList, elements);
  }

  async function initialize() {
    const page = document.body.dataset.page || "home";
    const fallbackProfile = { ...(config.profile || {}) };
    const cachedProfile = data.readCachedSiteConfig();
    const initialProfile = cachedProfile || fallbackProfile;
    const profilePromise = data.loadSiteConfig();

    ui.renderHeader(initialProfile, page);
    ui.renderFooter(initialProfile);

    if (page === "home") renderHome(initialProfile);
    if (page === "contact") renderContact(initialProfile);

    if (cachedProfile) {
      document.body.dataset.siteConfigState = "ready";
    }

    const pageDataPromise =
      page === "projects"
        ? renderProjects()
        : page === "education-experience"
          ? renderCareer()
          : page === "certifications"
            ? renderCertifications()
            : Promise.resolve();

    const profile = await profilePromise;
    ui.updateHeaderProfile(profile);
    ui.renderFooter(profile);

    if (page === "home") renderHome(profile);
    if (page === "contact") renderContact(profile);

    document.body.dataset.siteConfigState = "ready";
    await pageDataPromise;
  }

  initialize();
})();
