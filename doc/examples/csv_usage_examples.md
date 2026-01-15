# CSV Usage Examples for R and Python

The Forest Impact Simulator now exports CSV files in a format compatible with R and Python data analysis.

## CSV Format

The CSV now has:
- **Single header row** with descriptive column names
- **Single data row** per analysis
- **Proper escaping** of special characters
- **Consistent data types** for easy import

## Column Names

```
timestamp, simulator_version, simulation_years, latitude, longitude, 
region_north, region_south, region_east, region_west, soil_carbon_g_kg, 
soil_ph, soil_texture, temperature_c, precipitation_mm, 
annual_carbon_sequestration_kg_co2_year, total_carbon_kg_co2, 
biodiversity_impact, forest_resilience, water_retention_percent, 
air_quality_improvement_percent, average_biodiversity, average_resilience,
area_hectares, total_trees, spacing_meters, density_trees_hectare,
years_to_complete, trees_per_season, tree_names, tree_scientific_names, 
tree_carbon_rates_kg_co2_year, tree_percentages
```

## R Usage

```r
# Load the CSV file
data <- read.csv("forest-impact-analysis.csv")

# View the data
head(data)

# Access specific columns
carbon_sequestration <- data$annual_carbon_sequestration_kg_co2_year
biodiversity <- data$biodiversity_impact
air_quality <- data$air_quality_improvement_percent

# Convert tree data (semicolon-separated) to lists
tree_names <- strsplit(data$tree_names, ";")[[1]]
tree_percentages <- as.numeric(strsplit(data$tree_percentages, ";")[[1]])

# Create a simple plot
plot(data$total_trees, data$total_carbon_kg_co2, 
     xlab="Total Trees", ylab="Total Carbon (kg CO2)",
     main="Carbon Sequestration vs Forest Size")
```

## Python Usage

```python
import pandas as pd
import matplotlib.pyplot as plt

# Load the CSV file
df = pd.read_csv("forest-impact-analysis.csv")

# View the data
print(df.head())

# Access specific columns
carbon_sequestration = df['annual_carbon_sequestration_kg_co2_year']
biodiversity = df['biodiversity_impact']
air_quality = df['air_quality_improvement_percent']

# Convert tree data (semicolon-separated) to lists
tree_names = df['tree_names'].iloc[0].split(';')
tree_percentages = [float(x) for x in df['tree_percentages'].iloc[0].split(';')]

# Create a simple plot
plt.figure(figsize=(10, 6))
plt.scatter(df['total_trees'], df['total_carbon_kg_co2'])
plt.xlabel('Total Trees')
plt.ylabel('Total Carbon (kg CO2)')
plt.title('Carbon Sequestration vs Forest Size')
plt.show()

# Summary statistics
print(df.describe())
```

## Multiple Analyses

To analyze multiple forest impact scenarios:

1. Run multiple analyses in the simulator
2. Export each as CSV
3. Combine the files:

**R:**
```r
# Combine multiple CSV files
files <- list.files(pattern = "forest-impact-analysis-.*\\.csv")
all_data <- do.call(rbind, lapply(files, read.csv))
```

**Python:**
```python
import glob

# Combine multiple CSV files
files = glob.glob("forest-impact-analysis-*.csv")
all_data = pd.concat([pd.read_csv(f) for f in files], ignore_index=True)
```

## Data Types

- **Numeric columns**: All impact metrics, coordinates, environmental data
- **String columns**: Tree names, scientific names, soil texture
- **Semicolon-separated**: Multiple tree species data (names, percentages, etc.)
- **Empty values**: Represented as empty strings ("")

This format ensures compatibility with standard data analysis workflows in both R and Python.
