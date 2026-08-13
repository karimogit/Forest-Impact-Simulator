# Forest Impact Simulator

A comprehensive tool to simulate and analyze the environmental, economic, social, and land use impact of forest planting and clear-cutting operations.

🌐 **Live Application**: [forest-impact-simulator.vercel.app](https://forest-impact-simulator.vercel.app)

## 🌟 Key Features

- **🌍 Global Map Interface**: Interactive map with region selection (Desktop: CTRL+click and drag, Mobile: Tap to create selection square)
- **📊 Real-time Environmental Data**: Live soil, climate, and biodiversity information with intelligent fallbacks and performance optimizations
- **🌱 Dual Simulation Modes**: Analyze both forest planting benefits and clear-cutting impacts
- **📈 Advanced Impact Simulation**: Realistic tree growth curves and climate prediction over time
- **⏱️ Dynamic Time Analysis**: Simulate forest development over 1-100 years with year-by-year projections
- **📑 Comprehensive Impact Analysis**: Four detailed tabs covering Environment, Economic, Social, and Land Use impacts
- **🌳 Extensive Tree Database**: 80+ tree species across 7 climate zones with auto-recommendations
- **💼 Professional Planning Tools**: Realistic planting/removal configurations and project scale analysis
- **📥 Export Functionality**: Download results in GeoJSON (GIS), JSON (data), CSV (R/Python), and PDF formats
- **🔗 Shareable Links**: Generate shareable URLs to share your analysis with others
- **📱 Responsive Design**: Optimized for desktop and mobile devices with improved typography and accessibility

**Available Implementations**: 
- [TypeScript/Next.js (Web)](https://github.com/KarimOsmanGH/forest-impact-simulator) - This repository
- [Python Notebook](https://github.com/KarimOsmanGH/forest-impact-simulator-python)
- [R Notebook](https://github.com/KarimOsmanGH/forest-impact-simulator-r)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/KarimOsmanGH/forest-impact-simulator.git
   cd forest-impact-simulator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## ⚠️ Disclaimer

This simulator is for educational and planning purposes only. Use at your own risk. Always consult with forestry professionals, environmental experts, and local authorities before implementing any real-world projects.

## 📖 How to Use

1. **Select Region**: 
   - **Desktop**: CTRL+click and drag on the interactive map
   - **Mobile**: Tap to create a selection square, then drag to resize
2. **Choose Simulation Mode**: 
   - **🌱 Planting Mode**: Analyze the benefits of forest restoration and tree planting
   - **🪓 Clear-cutting Mode**: Analyze the environmental impacts of forest removal
3. **Review Data**: View automatically fetched environmental information:
   - Soil carbon content and pH
   - Current temperature and precipitation (with geographic fallbacks when unavailable)
   - Local biodiversity data
4. **Choose Trees/Forest Types**: Select from comprehensive tree species database across 7 climate zones (Tropical, Temperate, Mediterranean, Boreal, Coniferous, Arid, Subtropical)
   - **Planting Mode**: Auto-recommendations for climate-appropriate species
   - **Clear-cutting Mode**: Shows forest types present in the selected region
   - **Visual indicators**: Recommended species are marked with stars and sorted to the top
5. **Set Distribution**: For multiple trees, specify percentage distribution or use equal split
6. **Configure Settings**: 
   - **Calculation Mode**: Per tree or per area analysis
   - **Simulation Duration**: Adjust years (1-100) using the slider
   - **Spacing**: Customize tree spacing for planting configurations
   - **Tree Age** (Clear-cutting mode): Specify average age of existing trees for accurate carbon emission calculations
7. **Analyze Results**: Review comprehensive impacts across four tabs:
   - **Environment**: Soil data, climate data, carbon sequestration/emissions, biodiversity, and ecosystem benefits
   - **Economic**: Job creation/affected and economic considerations (varies by simulation mode)
   - **Social**: Community benefits and social impact assessment (varies by simulation mode)
   - **Land Use**: Erosion reduction/risk, soil improvement/degradation, and habitat creation/loss (varies by simulation mode)
8. **Export Results**: Download your analysis in GeoJSON (GIS), JSON (data), or CSV (R/Python analysis) format

## 🛠️ Technology Stack

### **Frontend**
- **Next.js 15**: React framework with App Router
- **React 19**: Latest React with concurrent features
- **TypeScript**: Type-safe development

### **Mapping & Visualization**
- **Leaflet**: Interactive maps with OpenStreetMap
- **React Leaflet**: React components for Leaflet

### **Environmental APIs**
- **[ISRIC SoilGrids](https://soilgrids.org/)**: Global soil data
- **[Open-Meteo](https://open-meteo.com/)**: Weather and climate data
- **[OpenStreetMap](https://www.openstreetmap.org/)**: Map tiles and geocoding

### **Styling & UI**
- **Tailwind CSS 4**: Utility-first CSS framework
- **Responsive Design**: Mobile-friendly interface

## 🔒 Security

This application implements comprehensive security measures to protect users and data:

- **Input Validation**: All user inputs are validated and sanitized using strict patterns
- **Rate Limiting**: Client-side rate limiting for UX (note: server-side enforcement recommended for production)
- **Performance Optimizations**: Caching, timeouts, and reduced data fetching for faster loading
- **Content Security Policy**: Enhanced CSP with `base-uri 'none'`, `object-src 'none'`, `form-action 'self'`, and upgrade-insecure-requests
- **XSS Protection**: Multiple layers including input sanitization, HTML escaping, and CSP headers
- **No Data Collection**: All processing is done client-side - no user data is sent to servers
- **API Timeouts**: All external API calls have timeouts to prevent hanging requests
- **Error Handling**: Comprehensive error boundaries and graceful degradation

For detailed security information, see [`doc/SECURITY.md`](doc/SECURITY.md). For recent security improvements, see [`doc/FINAL_REVIEW_AFTER_FIXES.md`](doc/FINAL_REVIEW_AFTER_FIXES.md).

## 🌍 Environmental Impact

The Forest Impact Simulator helps users understand the potential benefits of forest restoration by providing:

- **Data-Driven Insights**: Real environmental data from global databases
- **Quantified Impact**: Specific metrics for carbon sequestration and biodiversity
- **Real-world Comparisons**: Impact expressed in relatable terms (car emissions, flights, household electricity)
- **Long-term Planning**: Multi-decade simulation capabilities
- **Global Perspective**: Analysis for any region worldwide
- **Comprehensive Tree Database**: Extensive species coverage from all major climate zones including arid and subtropical regions

## 🧮 Calculations

### **Carbon Sequestration (Planting Mode)**

**Single Tree:**
```
Carbon = Base Rate (kg CO₂/year)
```

**Multiple Trees with Percentage Distribution:**
```
Carbon = Σ(Tree_i × Percentage_i / 100) + Soil Modifier
```

**Multiple Trees with Equal Distribution:**
```
Carbon = (Σ Tree_i) / n + Soil Modifier
```

**Environmental Modifiers:**
```
Soil Modifier = Soil Carbon (g/kg) × 0.1
```

### **Carbon Emissions (Clear-cutting Mode)**

**Immediate Carbon Release:**
```
Immediate Release = Σ(Base Rate × Growth Factor(year)) for year 1 to tree_age
```

**Lost Future Sequestration:**
```
Lost Future = Σ(Base Rate × Growth Factor(tree_age + year)) for year 1 to simulation_years
```

**Total Carbon Emissions:**
```
Total Emissions = Immediate Release + Lost Future Sequestration
```

**Tree Age Growth Factors:**
```
Age 1: 5% of mature rate
Age 2: 15% of mature rate  
Age 3: 30% of mature rate
Age 4: 50% of mature rate
Age 5: 70% of mature rate
Age 6: 85% of mature rate
Age 7-20: 95% of mature rate (mature trees)
Age 21-50: 90% of mature rate (older mature trees)
Age 50+: 85% of mature rate (very old trees)
```

**Note**: Clear-cutting mode calculates immediate carbon release as the total carbon stored in the tree over its lifetime (representing all carbon released when the tree is cut down) plus lost future sequestration (carbon that would have been absorbed over the simulation period). This provides realistic emission estimates based on the actual age and carbon storage of trees being removed.

### **Environmental Impact Calculations**

**Water Retention & Air Quality:**
- **Planting Mode**: Improve over time (+0.3% and +0.7% per year respectively) and scale with forest size
- **Clear-cutting Mode**: Immediately negative air quality impact (-10% to -30% based on forest size), then degrades further over time (-1.0% per year). Can reach -80% indicating severe air quality deterioration.

**Biodiversity & Forest Resilience:**
- **Planting Mode**: Improve over time (+0.05 and +0.03 per year respectively) and scale with forest size
- **Clear-cutting Mode**: Degrade over time (-0.05 and -0.03 per year respectively) and scale with forest size

**Social Impact:**
- **Planting Mode**: Positive social benefits (3.5/5 base score, improves over time)
- **Clear-cutting Mode**: Negative social impacts (2.0/5 base score, degrades over time)

**Land Use Impact:**
- **Planting Mode**: Positive improvements (erosion reduction, soil improvement, habitat creation)
- **Clear-cutting Mode**: Negative impacts (erosion increase, soil degradation, habitat loss)

**Real-world Comparisons:**
```
Car Emissions: Average car emits ~4.6 metric tons CO₂/year
Flight Emissions: One round-trip NY-London flight emits ~986 kg CO₂
Household Electricity: Average US household emits ~7.5 metric tons CO₂/year
```

**Realistic Growth Model:**
```
Year 1: 5% of mature rate (establishment)
Year 2: 15% of mature rate
Year 3: 30% of mature rate
Year 4: 50% of mature rate (rapid growth)
Year 5: 70% of mature rate
Year 6-10: 80% of mature rate
Year 11-20: 90% of mature rate (maturation)
Year 20+: 100% of mature rate (mature)
```

**Annual Carbon Calculation:**
```
Annual Carbon = Mature Rate × Growth Factor (based on year)
```

### **Climate Prediction**

**Temperature Trend Analysis:**
```
Historical Data = 5 years of temperature records (optimized for performance)
Linear Regression = Calculate temperature trend (°C/year)
Future Temperature = Current + (Trend × Years)
```

**Growth Modifier:**
```
Temperature Change = Future Temp - Current Temp
Growth Modifier = 1 + (Temperature Change × 0.02)
```

**Regional Estimates (fallback):**
```
Tropical: 25°C, Temperate: 15°C, Boreal: 5°C, Arctic: -5°C
```

**Cumulative Calculation:**
```
Total Carbon = Σ(Annual Rate × Growth Factor for each year)
```

### **Planting Timeline**

**Project Scale Classification:**
```
< 1,000 trees: Small-scale (Community/Backyard)
1,000-10,000 trees: Medium-scale (Local Restoration)
10,000-100,000 trees: Large-scale (Commercial Forestry)
100,000-1M trees: Very Large-scale (Regional Restoration)
> 1M trees: Massive-scale (National/International)
```

**Planting Rates by Scale:**
```
Small-scale: 50 trees/person/day, 2 people, 30 days/year
Medium-scale: 200 trees/person/day, 5 people, 60 days/year
Large-scale: 500 trees/person/day, 10 people, 90 days/year
Very Large-scale: 800 trees/person/day, 25 people, 120 days/year
Massive-scale: 1,000 trees/person/day, 50 people, 150 days/year
```

### **Biodiversity Impact**

**Base Calculation:**
```
Biodiversity = Σ(Tree_i × Percentage_i / 100) + Local Enhancement
```

**Local Enhancement:**
```
Local Enhancement = 0.2 (if local species detected)
Final Biodiversity = min(Biodiversity, 5.0)
```

### **Forest Resilience**

**Base Calculation:**
```
Resilience = Σ(Tree_i × Percentage_i / 100) + Climate Factor
```

**Climate Factor:**
```
Climate Factor = Annual Precipitation (mm) × 0.001
Final Resilience = min(Resilience, 5.0)
```

### **Water Retention**

**Progressive Improvement:**
```
Base Retention = 70-85% (based on latitude)
Annual Improvement = 0.3% per year
Precipitation Bonus = Annual Precipitation (mm) × 0.01
Water Retention = min(Base + (Years × 0.3) + Bonus, 95%)
```

### **Air Quality Impact**

**Planting Mode - Progressive Enhancement:**
```
Base Quality = 60%
Annual Improvement = 0.7% per year
Air Quality = min(Base + (Years × 0.7), 95%)
```

**Clear-cutting Mode - Immediate Negative Impact:**
```
Immediate Impact = -10% to -30% (based on forest size)
Annual Degradation = -1.0% per year
Air Quality = max(-80, -(Immediate Impact + (Years × 1.0)))
```

### **Mathematical Notation**

- **Σ**: Summation across all selected tree species
- **Tree_i**: Carbon sequestration rate of tree species i
- **Percentage_i**: User-specified percentage for tree species i
- **n**: Number of selected tree species
- **Years**: Simulation duration in years
- **min()**: Function returning the minimum value (capping at maximum)

## 📚 Data Sources & References

### **Carbon Sequestration**
- Default value of 25 kg CO₂/year per mature tree based on [IPCC Fourth Assessment Report](https://www.ipcc.ch/report/ar4/wg1/)
- Rates vary by species, age, and local conditions
- Peer-reviewed studies support these estimates
- Realistic growth curves account for tree age (young trees sequester less than mature ones)

### **Environmental Data**
- **[ISRIC SoilGrids](https://soilgrids.org/)**: Global soil information (carbon content, pH)
- **[Open-Meteo](https://open-meteo.com/)**: Climate and weather data (temperature, precipitation, historical trends)
- **[OpenStreetMap](https://www.openstreetmap.org/)**: Map tiles, geocoding, and forest/protected area overlays
- **[Overpass API](https://overpass-api.de/)**: Forest and protected area boundary data
- **Scientific Literature**: Biodiversity values based on peer-reviewed research

### **Acknowledgments**
We thank the following organizations for providing the data and services that make this simulator possible:
- **[ISRIC SoilGrids](https://soilgrids.org/)** for global soil data
- **[Open-Meteo](https://open-meteo.com/)** for climate information
- **[OpenStreetMap](https://www.openstreetmap.org/)** for map tiles and geographic data
- **[Overpass API](https://overpass-api.de/)** for forest and protected area data

## 🤝 Contributing

We welcome contributions! This project is open source because environmental knowledge belongs to everyone.

### How to Contribute
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Areas for Contribution
- Additional tree species and climate zones
- Enhanced visualization features
- Improved calculation algorithms
- Mobile app development
- Documentation improvements
- Security enhancements
- Additional environmental data sources
- Real-world comparison metrics

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📖 Documentation

Additional documentation is available in the [`doc/`](doc/) directory:

- **[SECURITY.md](doc/SECURITY.md)**: Detailed security measures and implementation
- **[TYPOGRAPHY_DESIGN_IMPROVEMENTS.md](doc/TYPOGRAPHY_DESIGN_IMPROVEMENTS.md)**: Design and typography enhancements
- **[IMPROVEMENTS_SUGGESTIONS.md](doc/IMPROVEMENTS_SUGGESTIONS.md)**: Future improvement suggestions
- **[DEPLOYMENT_CHECKLIST.md](doc/DEPLOYMENT_CHECKLIST.md)**: Deployment guidelines
- **[DATA_FETCHING_ANALYSIS.md](doc/DATA_FETCHING_ANALYSIS.md)**: API integration details
- **[examples/csv_usage_examples.md](doc/examples/csv_usage_examples.md)**: CSV export usage examples

## 📞 Contact

- **Developer**: [Karim Osman](https://kar.im)
- **Live Application**: [forest-impact-simulator.vercel.app](https://forest-impact-simulator.vercel.app)
- **Project**: [Forest Impact Simulator (GitHub)](https://github.com/KarimOsmanGH/forest-impact-simulator)
- **Issues**: [GitHub Issues](https://github.com/KarimOsmanGH/forest-impact-simulator/issues)

---

## ❓ FAQ

For comprehensive answers to frequently asked questions, please visit the [live application](https://forest-impact-simulator.vercel.app) and scroll to the FAQ section at the bottom of the page. The FAQ includes detailed information about:

- **Planting and Clear-cutting Modes**: How each mode works and when to use them
- **Impact Analysis Tabs**: What each tab (Environment, Economic, Social, Land Use) shows
- **Carbon Sequestration Accuracy**: How estimates are calculated and their scientific basis
- **Tree Selection**: Single vs. multiple species analysis
- **Data Export**: How to use exported CSV, JSON, and GeoJSON files
- **Environmental Data**: Sources and accuracy of soil, climate, and biodiversity data
- **Contributing**: How to contribute to the project

### Quick Answers

**Q: How do I import CSV data into R or Python?**  
A: The CSV export is in standard tabular format. Use `read.csv()` in R or `pd.read_csv()` in Python. See [`doc/examples/csv_usage_examples.md`](doc/examples/csv_usage_examples.md) for detailed examples.

**Q: Can I analyze multiple tree species at once?**  
A: Yes! Select multiple tree types and specify percentage distributions. The simulator calculates weighted averages for all impact metrics.

**Q: How accurate are the carbon sequestration rates?**  
A: Based on IPCC data with species-specific adjustments. Rates vary by tree age, climate, and local conditions. Always consult local forestry experts for project-specific planning.

