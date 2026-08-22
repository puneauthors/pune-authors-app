import re

with open('src/app/components/OperationsDashboardPage.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

pages_and_banners_ui = """
        {/* Pages & Banners */}
        <div className="bg-white p-8 border border-paa-navy/5 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out rounded-3xl-2xl mb-8">
          <div className="border-b border-paa-navy/5 pb-4 mb-8">
            <h2 className="text-xl font-serif font-medium text-paa-navy mb-1">
              Pages & Banners
            </h2>
            <p className="text-paa-gray-text text-sm">
              Manage the images for the About page and Invite Author page here.
            </p>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-paa-navy mb-2">
                ABOUT PAGE IMAGE
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setSettings({ ...settings, about_page_image: reader.result as string });
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="w-full border border-paa-navy/20 bg-gray-50 rounded-lg p-3 text-sm outline-none focus:border-paa-navy focus:bg-white transition-colors"
              />
              {settings.about_page_image && (
                <img src={settings.about_page_image} alt="About preview" className="mt-4 max-h-32 rounded border border-gray-200" />
              )}
            </div>
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-paa-navy mb-2">
                INVITE AUTHOR BANNER IMAGE
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setSettings({ ...settings, invite_author_banner_image: reader.result as string });
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="w-full border border-paa-navy/20 bg-gray-50 rounded-lg p-3 text-sm outline-none focus:border-paa-navy focus:bg-white transition-colors"
              />
              {settings.invite_author_banner_image && (
                <img src={settings.invite_author_banner_image} alt="Banner preview" className="mt-4 max-h-32 rounded border border-gray-200" />
              )}
            </div>
          </div>
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-paa-navy text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-paa-gold hover:text-paa-navy transition-all duration-300 disabled:opacity-50 shadow-md"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>

"""

if "Pages & Banners" not in c:
    c = c.replace("{/* Main Landing Page Content */}", pages_and_banners_ui + "        {/* Main Landing Page Content */}")

with open('src/app/components/OperationsDashboardPage.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
