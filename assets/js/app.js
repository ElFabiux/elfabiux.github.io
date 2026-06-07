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
      imageUrl: row.imageUrl || "",
      credentialUrl: row.credentialUrl || ""
    };
  }

  function normalizeSkill(row) {
    const rawSection = String(row.section || "Technical").trim().toLowerCase();
    let section = "technical";

    if (["language", "languages"].includes(rawSection)) {
      section = "languages";
    } else if (
      ["power", "power skill", "power skills", "soft skill", "soft skills"].includes(
        rawSection
      )
    ) {
      section = "power-skills";
    }

    return {
      name: row.name || "",
      section,
      category: row.category || "General",
      level: row.level || ""
    };
  }

  function renderHome(profile) {
    const nameTarget = document.querySelector("[data-profile-name]");
    const descriptionTarget = document.querySelector("[data-profile-description]");
    const linksTarget = document.querySelector("[data-home-links]");

    if (nameTarget) nameTarget.textContent = profile.name || "Portfolio Owner";
    if (descriptionTarget) renderFormattedText(descriptionTarget, profile.description || "");

    if (linksTarget) {
      const links = [
        ui.createExternalLink("LinkedIn", profile.linkedinUrl, "command-button"),
        ui.createExternalLink("GitHub", profile.githubUrl, "command-button")
      ].filter(Boolean);

      clearAndAppend(linksTarget, links);
    }
  }

  function createFormattedParagraph(text) {
    const paragraph = ui.createElement("p");
    const lines = String(text || "").split("\n");

    lines.forEach((line, lineIndex) => {
      if (lineIndex > 0) {
        paragraph.appendChild(document.createElement("br"));
      }

      const parts = line.split(/(\*\*[^*]+\*\*)/g);

      parts.forEach((part) => {
        if (!part) return;

        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          paragraph.appendChild(ui.createElement("strong", "", part.slice(2, -2)));
        } else {
          paragraph.appendChild(document.createTextNode(part));
        }
      });
    });

    return paragraph;
  }

  function renderFormattedText(container, text) {
    const paragraphs = String(text || "")
      .replace(/\r\n/g, "\n")
      .split(/\n\s*\n/)
      .map((paragraph) =>
        paragraph
          .split("\n")
          .map((line) => line.trim())
          .join("\n")
          .trim()
      )
      .filter(Boolean);

    clearAndAppend(
      container,
      (paragraphs.length > 0 ? paragraphs : [""]).map(createFormattedParagraph)
    );
  }

  function initializeHomeTerminal() {
    const commandTarget = document.querySelector("[data-terminal-command]");
    const outputTarget = document.querySelector("[data-terminal-output]");

    if (!commandTarget || !outputTarget) return;

    const scenes = [
      {
        command: "cat current-focus.txt",
        output: ["software / cybersecurity / continuous learning"]
      },
      {
        command: "cat work-mode.conf",
        output: ["clear over clever", "security in mind", "ship what solves the problem"]
      },
      {
        command: "ping next-challenge.dev",
        output: ["reply: curiosity alive", "packet loss: 0%", "status: ready to learn"]
      },
      {
        command: "python hack_the_planet.py",
        output: ["SyntaxError: too much Hollywood"]
      }
    ];

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      commandTarget.textContent = scenes[0].command;
      outputTarget.replaceChildren(
        ...scenes[0].output.map((line) => ui.createElement("span", "", line))
      );
      return;
    }

    let sceneIndex = 0;
    let characterIndex = 0;
    let phase = "typing";
    let timerId;

    function schedule(delay) {
      window.clearTimeout(timerId);
      timerId = window.setTimeout(runScene, delay);
    }

    function renderOutput(lines) {
      outputTarget.replaceChildren(
        ...lines.map((line) => ui.createElement("span", "", line))
      );
    }

    function runScene() {
      const scene = scenes[sceneIndex];

      if (phase === "typing") {
        characterIndex += 1;
        commandTarget.textContent = scene.command.slice(0, characterIndex);

        if (characterIndex < scene.command.length) {
          schedule(45 + Math.round(Math.random() * 45));
          return;
        }

        phase = "executing";
        schedule(520);
        return;
      }

      if (phase === "executing") {
        renderOutput(scene.output);
        phase = "reading";
        schedule(2100);
        return;
      }

      if (phase === "reading") {
        renderOutput([]);
        phase = "deleting";
        schedule(180);
        return;
      }

      characterIndex -= 1;
      commandTarget.textContent = scene.command.slice(0, characterIndex);

      if (characterIndex > 0) {
        schedule(24);
        return;
      }

      sceneIndex = (sceneIndex + 1) % scenes.length;
      phase = "typing";
      schedule(420);
    }

    schedule(700);
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

  async function renderSkills() {
    const sectionsContainer = document.querySelector("[data-skills-sections]");
    const technicalSection = document.querySelector("[data-technical-section]");
    const languagesSection = document.querySelector("[data-languages-section]");
    const powerSkillsSection = document.querySelector("[data-power-skills-section]");
    const technicalContainer = document.querySelector("[data-technical-skills]");
    const languagesContainer = document.querySelector("[data-languages-list]");
    const powerSkillsContainer = document.querySelector("[data-power-skills-list]");
    const stateTarget = document.querySelector("[data-skills-state]");

    try {
      const rows = await data.fetchCsv(config.dataSources.skills);
      const skills = data
        .visibleAndSorted(rows)
        .map(normalizeSkill)
        .filter((skill) => skill.name);
      const technicalSkills = skills.filter((skill) => skill.section === "technical");
      const languages = skills.filter((skill) => skill.section === "languages");
      const powerSkills = skills.filter((skill) => skill.section === "power-skills");

      if (skills.length === 0) {
        sectionsContainer.hidden = true;
        setState(stateTarget, "No visible skills are available.", "empty");
        finishLoading(stateTarget);
        return;
      }

      const categories = new Map();
      technicalSkills.forEach((skill) => {
        if (!categories.has(skill.category)) {
          categories.set(skill.category, []);
        }
        categories.get(skill.category).push(skill);
      });

      clearAndAppend(
        technicalContainer,
        Array.from(categories, ([category, entries]) =>
          ui.createSkillCategory(category, entries)
        )
      );
      clearAndAppend(
        languagesContainer,
        languages.map((language) => ui.createLanguageItem(language))
      );
      clearAndAppend(
        powerSkillsContainer,
        powerSkills.map((skill) => ui.createPowerSkillItem(skill))
      );

      technicalSection.hidden = technicalSkills.length === 0;
      languagesSection.hidden = languages.length === 0;
      powerSkillsSection.hidden = powerSkills.length === 0;
      sectionsContainer.hidden = false;
      setState(stateTarget, "", "");
      finishLoading(stateTarget);
    } catch (error) {
      console.error("Skills could not be loaded.", error);
      sectionsContainer.hidden = true;
      setState(
        stateTarget,
        "Skills could not be loaded. Check the CSV URL in config.js.",
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
    if (page === "home") initializeHomeTerminal();

    if (cachedProfile) {
      document.body.dataset.siteConfigState = "ready";
    }

    const pageDataPromise =
      page === "projects"
        ? renderProjects()
        : page === "skills"
          ? renderSkills()
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
