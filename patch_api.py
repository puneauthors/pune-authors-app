import re
with open('server/routes/api.js', 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace("'organizer_hero_subtitle'", "'organizer_hero_subtitle', 'about_page_image', 'invite_author_banner_image'")
c = c.replace("organizerHeroSubtitle: settingsMap['organizer_hero_subtitle'] || ''", "organizerHeroSubtitle: settingsMap['organizer_hero_subtitle'] || '',\n        aboutPageImage: settingsMap['about_page_image'] || null,\n        inviteAuthorBannerImage: settingsMap['invite_author_banner_image'] || null")
with open('server/routes/api.js', 'w', encoding='utf-8') as f:
    f.write(c)
