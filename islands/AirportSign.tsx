export default function AirportSign() {
  return (
    <div class="relative inline-block mb-12">
      {/* Left Pole */}
      <div class="absolute left-8 -top-24 w-4 h-24 bg-gradient-to-r from-slate-800 via-slate-600 to-slate-800 rounded-t-lg">
      </div>
      {/* Right Pole */}
      <div class="absolute right-8 -top-24 w-4 h-24 bg-gradient-to-r from-slate-800 via-slate-600 to-slate-800 rounded-t-lg">
      </div>
      {/* Display Board */}
      <div class="relative bg-gradient-to-b from-slate-800 to-slate-900 p-1 rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.3)]">
        {/* Metallic Frame */}
        <div class="bg-gradient-to-b from-slate-600 via-slate-700 to-slate-800 p-2 rounded-[6px]">
          {/* Inner Frame */}
          <div class="bg-black px-4 py-0.5 rounded-[4px] relative overflow-hidden">
            {/* Screen Background with Effects */}
            <div class="absolute inset-0 bg-[#0a0a2f]">
              {/* Scan lines */}
              <div class="absolute inset-0 bg-[linear-gradient(transparent_0%,_rgba(255,255,255,0.02)_50%,_transparent_100%)] bg-[length:100%_4px]">
              </div>
              {/* Screen noise */}
              <div class="absolute inset-0 opacity-[0.03] [background-image:url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')]">
              </div>
            </div>

            {/* Display Board Text */}
            <div className="relative flex justify-center items-center py-1 sm:py-2 pb-2 sm:pb-4 px-2 sm:px-4">
              <div className="relative text-center">
                <span className="font-mono text-[2em] sm:text-[3em] font-semibold tracking-[0.12em] leading-[0.9] text-white 
                           [text-shadow:0_0_20px_rgba(255,255,255,0.2),0_0_40px_rgba(255,255,255,0.1)]
                           relative z-10">
                  ATP INTERNECTIONAL AIRPORT
                </span>
                {/* Text glow effect */}
                <div className="absolute inset-0 blur-[2px] opacity-50">
                  <span className="font-mono text-[2em] sm:text-[3em] font-semibold tracking-[0.12em] leading-[0.9] text-white">
                    ATP INTERNECTIONAL AIRPORT
                  </span>
                </div>
              </div>
            </div>

            {/* Screen reflection overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/[0.03]">
            </div>
            {/* Vignette effect */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.2)_100%)]">
            </div>
          </div>
        </div>
      </div>

      {/* Under Construction Extension BELOW the sign, perfectly matching main sign frame, no outline or padding on top */}
      <div className="absolute left-1/2 top-full -translate-x-1/2">
        <div className="bg-gradient-to-b from-slate-800 to-slate-900 pb-1 px-1 rounded-b-lg rounded-t-none shadow-[0_2px_10px_rgba(0,0,0,0.3)] border-t-0">
          <div className="bg-gradient-to-b from-slate-600 via-slate-700 to-slate-800 pb-2 px-2 rounded-b-[6px] rounded-t-none border-t-0">
            <div className="bg-black px-4 pt-0 pb-0.5 rounded-b-[4px] rounded-t-none border-t-0">
              <span className="font-mono text-sm font-medium tracking-wider text-yellow-400 [text-shadow:0_0_10px_rgba(255,255,0,0.3)] animate-pulse">
                UNDER CONSTRUCTION
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
