export default {
  async fetch(request) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get("url");

    // যদি কোনো টার্গেট URL না থাকে
    if (!targetUrl) {
      return new Response("Missing 'url' parameter. Example: ?url=https://wikisport.club/...", { status: 400 });
    }

    try {
      // অরিজিনাল সাইট থেকে ডেটা নিয়ে আসা
      let response = await fetch(targetUrl, {
        headers: {
          "User-Agent": request.headers.get("User-Agent"),
          "Referer": targetUrl
        }
      });

      // যদি রেসপন্স HTML না হয় (যেমন ভিডিও ফাইল বা ইমেজ), তবে ডিরেক্ট পাস করে দিবে
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) {
        return new Response(response.body, response);
      }

      // যদি HTML হয়, তবে সেটাকে মডিফাই করবো
      let html = await response.text();

      // 💉 ইনজেকশন স্ক্রিপ্ট: এটি পপআপ এবং রিডাইরেক্ট চিরতরে বন্ধ করে দিবে
      const adKillerScript = `
        <script>
          // ১. পপআপ (নতুন ট্যাব) খোলা পুরোপুরি ব্লক
          window.open = function() { console.log("Blocked a popup!"); return null; };
          
          // ২. বিরক্তিকর অ্যালার্ট বক্স ব্লক
          window.alert = function() {};
          window.confirm = function() { return true; };
          
          // ৩. স্যান্ডবক্স ডিটেক্টর বাইপাস (যেন প্লেয়ার বুঝতে না পারে সে আইফ্রেমে আছে)
          Object.defineProperty(window, 'top', { value: window, writable: false, configurable: false });
        </script>
      `;

      // HTML এর <head> ট্যাগের ঠিক পরেই আমাদের কিলার স্ক্রিপ্ট বসিয়ে দিব
      html = html.replace('<head>', '<head>' + adKillerScript);

      // নতুন ক্লিন করা HTML ইউজারের ব্রাউজারে পাঠানো
      return new Response(html, {
        status: response.status,
        headers: {
          "Content-Type": "text/html;charset=UTF-8",
          "Access-Control-Allow-Origin": "*", // যেকোনো সাইটে আইফ্রেম সাপোর্ট করার জন্য
          // X-Frame-Options ইচ্ছা করেই দিচ্ছি না, যাতে ব্লক না হয়
        }
      });

    } catch (e) {
      return new Response("Error fetching stream: " + e.message, { status: 500 });
    }
  }
};
