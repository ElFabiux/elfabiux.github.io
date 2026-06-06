(function () {
  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);

    if (className) {
      element.className = className;
    }

    if (text !== undefined && text !== null && text !== "") {
      element.textContent = text;
    }

    return element;
  }

  function normalizeBasePath(value) {
    const basePath = String(value || "/").trim();

    if (basePath === "/") {
      return "/";
    }

    return `/${basePath.replace(/^\/|\/$/g, "")}/`;
  }

  function internalUrl(path) {
    const basePath = normalizeBasePath(
      window.PORTFOLIO_CONFIG && window.PORTFOLIO_CONFIG.basePath
    );
    const cleanPath = String(path || "").replace(/^\/|\/$/g, "");
    return cleanPath ? `${basePath}${cleanPath}/` : basePath;
  }

  function safeExternalUrl(value) {
    try {
      const url = new URL(value);
      return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.href : "";
    } catch (error) {
      return "";
    }
  }

  function createExternalLink(label, url, className) {
    const safeUrl = safeExternalUrl(url);

    if (!safeUrl) {
      return null;
    }

    const link = createElement("a", className, label);
    link.href = safeUrl;

    if (!safeUrl.startsWith("mailto:")) {
      link.target = "_blank";
      link.rel = "noreferrer";
    }

    return link;
  }

  function applyTheme(theme) {
    const selectedTheme = theme === "light" ? "light" : "dark";
    const themeController = window.PortfolioTheme;

    if (themeController) {
      themeController.set(selectedTheme);
    } else {
      document.documentElement.dataset.theme = selectedTheme;
    }

    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.innerHTML =
        selectedTheme === "dark"
          ? `
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="4"></circle>
              <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"></path>
            </svg>
          `
          : `
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
            </svg>
          `;
      button.setAttribute(
        "aria-label",
        `Switch to ${selectedTheme === "dark" ? "light" : "dark"} theme`
      );
      button.title = selectedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme";
    });
  }

  function renderHeader(profile, activePage) {
    const header = document.querySelector("[data-site-header]");
    if (!header) return;

    const inner = createElement("div", "site-header__inner");
    const brand = createElement("a", "site-brand", profile.brand || "~/whoami");
    brand.dataset.siteBrand = "";
    brand.dataset.siteConfigContent = "";
    brand.href = internalUrl("");
    brand.setAttribute("aria-label", "Go to homepage");
    inner.appendChild(brand);

    const menuButton = createElement("button", "nav-toggle", "Menu");
    menuButton.type = "button";
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-controls", "site-navigation");
    inner.appendChild(menuButton);

    const navigation = createElement("nav", "site-navigation");
    navigation.id = "site-navigation";
    navigation.setAttribute("aria-label", "Primary navigation");

    const routes = [
      { page: "projects", label: "Projects", path: "projects" },
      {
        page: "education-experience",
        label: "Education & Experience",
        path: "education-experience"
      },
      { page: "certifications", label: "Certifications", path: "certifications" },
      { page: "contact", label: "Contact", path: "contacto" }
    ];

    routes.slice(0, 3).forEach((route) => {
      navigation.appendChild(createNavigationLink(route, activePage));
    });

    const cvLink = createExternalLink("CV", profile.cvUrl, "nav-link");
    if (cvLink) {
      cvLink.dataset.cvLink = "";
      cvLink.dataset.siteConfigContent = "";
      navigation.appendChild(cvLink);
    }

    navigation.appendChild(createNavigationLink(routes[3], activePage));

    const themeButton = createElement("button", "theme-toggle");
    themeButton.type = "button";
    themeButton.dataset.themeToggle = "";
    navigation.appendChild(themeButton);
    inner.appendChild(navigation);
    header.replaceChildren(inner);

    function closeNavigation() {
      navigation.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.textContent = "Menu";
    }

    menuButton.addEventListener("click", () => {
      const isOpen = menuButton.getAttribute("aria-expanded") === "true";

      if (isOpen) {
        closeNavigation();
      } else {
        navigation.classList.add("is-open");
        menuButton.setAttribute("aria-expanded", "true");
        menuButton.textContent = "Close";
      }
    });

    navigation.addEventListener("click", (event) => {
      if (event.target.closest("a") && navigation.classList.contains("is-open")) {
        closeNavigation();
      }
    });

    document.addEventListener("click", (event) => {
      if (
        navigation.classList.contains("is-open") &&
        !inner.contains(event.target)
      ) {
        closeNavigation();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && navigation.classList.contains("is-open")) {
        closeNavigation();
        menuButton.focus();
      }
    });

    themeButton.addEventListener("click", () => {
      const currentTheme = document.documentElement.dataset.theme;
      applyTheme(currentTheme === "dark" ? "light" : "dark");
    });

    applyTheme(document.documentElement.dataset.theme);
  }

  function updateHeaderProfile(profile) {
    const brand = document.querySelector("[data-site-brand]");
    const cvLink = document.querySelector("[data-cv-link]");

    if (brand && profile.brand) {
      brand.textContent = profile.brand;
    }

    if (cvLink) {
      const cvUrl = safeExternalUrl(profile.cvUrl);

      if (cvUrl) {
        cvLink.href = cvUrl;
      }
    }
  }

  function createNavigationLink(route, activePage) {
    const link = createElement("a", "nav-link", route.label);
    link.href = internalUrl(route.path);

    if (route.page === activePage) {
      link.classList.add("is-active");
      link.setAttribute("aria-current", "page");
    }

    return link;
  }

  function renderFooter(profile) {
    const footer = document.querySelector("[data-site-footer]");
    if (!footer) return;

    const inner = createElement("div", "site-footer__inner");
    inner.dataset.siteConfigContent = "";
    inner.appendChild(
      createElement(
        "span",
        "",
        `${profile.name || "Portfolio"} / ${new Date().getFullYear()}`
      )
    );
    inner.appendChild(createElement("span", "footer-status", "status: online"));
    footer.replaceChildren(inner);
  }

  function renderFilters(container, values, selectedValue, onSelect, allLabel) {
    if (!container) return;

    container.replaceChildren();
    const options = [allLabel || "All", ...values];

    options.forEach((value) => {
      const button = createElement("button", "filter-button", value);
      button.type = "button";
      button.dataset.filterValue = value;
      const isSelected = value.toLowerCase() === selectedValue.toLowerCase();
      button.classList.toggle("is-active", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
      button.addEventListener("click", () => onSelect(value));
      container.appendChild(button);
    });
  }

  function renderToggleFilters(container, values, selectedValues, onToggle) {
    if (!container) return;

    container.replaceChildren();

    values.forEach((value) => {
      const button = createElement("button", "filter-button", value);
      button.type = "button";
      button.dataset.filterValue = value;
      const isSelected = Array.from(selectedValues).some(
        (selectedValue) => selectedValue.toLowerCase() === value.toLowerCase()
      );
      button.classList.toggle("is-active", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
      button.addEventListener("click", () => onToggle(value));
      container.appendChild(button);
    });
  }

  function createProjectItem(project) {
    const article = createElement("article", "record-item project-item");
    const header = createElement("div", "record-item__header");
    header.appendChild(createElement("h2", "record-item__title", project.title));
    header.appendChild(createElement("p", "record-item__meta", project.stack));
    article.appendChild(header);

    if (project.description) {
      article.appendChild(createElement("p", "record-item__description", project.description));
    }

    const repositoryLink = createExternalLink(
      "Open repository",
      project.githubUrl,
      "command-button"
    );

    if (repositoryLink) {
      article.appendChild(repositoryLink);
    }

    return article;
  }

  function createCareerItem(entry) {
    const article = createElement("article", "career-item");
    const heading = createElement("div", "career-item__heading");
    heading.appendChild(createElement("h2", "record-item__title", entry.title));
    article.appendChild(heading);

    const organizationParts = [entry.organization, entry.location].filter(Boolean);
    if (organizationParts.length > 0) {
      article.appendChild(
        createElement("p", "record-item__meta", organizationParts.join(" / "))
      );
    }

    const dateRange =
      entry.startDate || entry.endDate
        ? [entry.startDate, entry.endDate || "Present"].filter(Boolean).join(" - ")
        : "";
    if (dateRange) {
      article.appendChild(createElement("p", "career-item__dates", dateRange));
    }

    if (entry.description) {
      article.appendChild(createElement("p", "record-item__description", entry.description));
    }

    return article;
  }

  function createCertificationItem(certification) {
    const article = createElement("article", "certification-item");

    if (certification.imageUrl) {
      const safeImageUrl = safeExternalUrl(certification.imageUrl);

      if (safeImageUrl) {
        article.classList.add("has-image");
        const imageWrapper = createElement("div", "certification-item__image");
        const image = createElement("img");
        image.src = safeImageUrl;
        image.alt = `${certification.name} certificate`;
        image.loading = "lazy";
        image.addEventListener("error", () => {
          article.classList.remove("has-image");
          imageWrapper.remove();
        });
        imageWrapper.appendChild(image);
        article.appendChild(imageWrapper);
      }
    }

    const content = createElement("div", "certification-item__content");
    const labelRow = createElement("div", "certification-item__labels");

    if (certification.status) {
      const statusClass = certification.status
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z-]/g, "");
      labelRow.appendChild(
        createElement(
          "span",
          `text-label certification-status certification-status--${statusClass}`,
          certification.status
        )
      );
    }

    certification.topics.forEach((topic) => {
      labelRow.appendChild(createElement("span", "text-label", topic));
    });

    if (labelRow.children.length > 0) {
      content.appendChild(labelRow);
    }

    content.appendChild(createElement("h2", "record-item__title", certification.name));

    const meta = [certification.issuer, certification.date].filter(Boolean).join(" / ");
    if (meta) {
      content.appendChild(createElement("p", "record-item__meta", meta));
    }

    if (certification.description) {
      content.appendChild(
        createElement("p", "record-item__description", certification.description)
      );
    }

    const credentialLink = createExternalLink(
      "View credential",
      certification.credentialUrl,
      "command-button"
    );

    if (credentialLink) {
      content.appendChild(credentialLink);
    }

    article.appendChild(content);
    return article;
  }

  window.PortfolioUI = {
    applyTheme,
    createCareerItem,
    createCertificationItem,
    createElement,
    createExternalLink,
    createProjectItem,
    renderFilters,
    renderFooter,
    renderHeader,
    renderToggleFilters,
    updateHeaderProfile
  };
})();
